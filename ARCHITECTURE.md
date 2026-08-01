# Dev Nexus — MVP Scope & Module Architecture

Stack: Next.js (single full-stack app), MongoDB, local-machine deployment, single user.

## 1. MVP scope (v1)

Everything else in the original roadmap is deferred until this slice is working end to end.

**Core Platform (trimmed for single-user/local):**
- Auth — single admin account, session cookie. No roles/permissions/2FA yet (Security Center is Priority 13 for a reason).
- Dashboard shell — nav is generated from installed modules, not hardcoded.
- Settings — global app config (per-module config lives with the module, see §3).
- Theme Manager — light/dark, stored in Settings.
- Secret Manager — encrypted storage for API keys/tokens/connection strings other modules need (n8n API key, Docker socket path, DB connection strings). Build this before any integration module, since every integration needs it.
- Module Registry — install/enable/disable state per module (see §2).

Explicitly deferred from Core: User Profile, Portfolio, Global Search, Activity Timeline, Notification Center. Add each only when something in v1 actually needs it.

**One vertical slice, built completely:** n8n Manager
- Workflow List, Start/Stop, Enable/Disable, Execute Workflow, Execution History.
- Deferred within this module: Import/Export, Webhook Tester, Templates, Statistics.

Why n8n Manager specifically: it has a real HTTP API, needs a stored secret (API key), needs its own nav entry and page, and needs its own Mongo collection for cached execution history — it exercises every seam in the module contract (§2) without pulling in Docker sockets, K8s auth, or cloud SDKs. Once this module works, the pattern for Inngest Manager, Docker Manager, etc. is just "repeat the recipe," not "invent it again."

**Non-goals for v1** (don't build yet, don't design around them prematurely):
- Multi-user auth, roles/permissions — you're the only user on your own machine.
- Hot-pluggable third-party plugins (npm-installable modules) — v1 modules live in-repo; the "Future Plugin System" section of the original roadmap is real but is a v2+ concern once the in-repo contract has proven itself with 3-4 modules.
- Any Center beyond Automation (n8n only) — no Docker, Database, Monitoring, Deployment, Cloud, etc. yet.

## 2. Kernel & Module SDK

This is what makes the module system **strong** (compiler- and runtime-enforced boundaries) and **flexible** (modules decoupled from each other and from how they're loaded) without building a full plugin-loading system yet.

**Rule: a module never touches global state directly.** No module imports a shared Mongo client, a shared secrets store, or another module's code. Everything a module needs is handed to it through a `ModuleContext` at registration time:

```ts
export interface ModuleContext {
  db: Db                 // Mongo db handle, pre-scoped — module still owns its own collection names
  secrets: {
    get(name: string): Promise<string>   // decrypts on read; module never sees the encryption key
  }
  events: EventBus        // see below
  logger: Logger           // pre-tagged with the module id
  config: unknown          // this module's saved config, already validated against configSchema
}
```

Why this matters more than it looks: the *reason* v1 uses a static registry instead of dynamic plugin loading (§ below) is complexity, not architecture. Because modules only ever talk to `ModuleContext` and never reach into globals, swapping the static registry for a dynamic loader later is a change to the loader only — zero changes inside any module. That's the actual mechanism behind "grows without major rewrites" in VISION.md, not just a hope.

**Event bus — how modules talk to each other without knowing about each other.** In-process pub/sub for v1 (no external queue, nothing persisted by default):

```ts
events.emit("n8n.workflow.executed", { workflowId, status })
events.on("n8n.*", handler)   // or events.on("*", handler) for a catch-all
```

n8n Manager emits events from day one even though nothing subscribes yet. When Activity Timeline or Notification Center get built later (Phase 2+), they subscribe to existing events — n8n Manager's code never changes. This is what "modular" needs to mean for a platform this size: modules that don't import each other, coordinated only through the bus and shared context.

**Module contract:**

```ts
export interface DevNexusModule {
  manifest: ModuleManifest
  configSchema?: ZodSchema          // validated on save, before a module can be enabled
  register(ctx: ModuleContext): {
    routes: RouteDefinition[]
    pages: PageDefinition[]
  }
  onEnable?(ctx: ModuleContext): Promise<void>
  onDisable?(ctx: ModuleContext): Promise<void>
  healthCheck?(ctx: ModuleContext): Promise<{ ok: boolean; message?: string }>
}
```

- `configSchema` (Zod) means bad module config is rejected at save time in Settings, not discovered at runtime three clicks later — this is the "strong" half in a TypeScript codebase.
- `onEnable`/`onDisable` give a module a hook to do setup/teardown (e.g. create Mongo indexes, start a poll timer) instead of doing it at import time, which would run even for disabled modules.
- `healthCheck` is optional now but is exactly what a future Monitoring Center / dashboard health widget will call — build the hook now, wire the UI later.

## 3. Module contract (files & loading)

Each module is a folder under `modules/<module-id>/`:

```
modules/n8n-manager/
  manifest.ts       # metadata, nav entry, required secrets, configSchema
  index.ts           # implements DevNexusModule — register/onEnable/onDisable/healthCheck
  server/
    routes.ts        # API handlers, mounted under /api/modules/n8n-manager/*
  client/
    pages/            # rendered under /dashboard/n8n-manager/*
    components/
  db/
    collections.ts    # collection names + index definitions this module owns
```

`manifest.ts` shape:

```ts
export const manifest = {
  id: "n8n-manager",
  name: "n8n Manager",
  category: "automation",
  icon: "Workflow",
  version: "0.1.0",
  navEntry: { label: "n8n", path: "/dashboard/n8n-manager" },
  requiredSecrets: ["N8N_API_URL", "N8N_API_KEY"],
  emits: ["n8n.workflow.executed", "n8n.workflow.failed"],   // documented, not enforced
  defaultEnabled: false,
}
```

**How core loads modules (v1, static — not dynamic plugin loading):**
- A single `modules/registry.ts` imports each module's `DevNexusModule` object explicitly and calls `register(ctx)` with a `ModuleContext` built by the kernel. Adding a module = adding one line to this file, not filesystem scanning or dynamic `import()` of arbitrary packages.
- Core reads `manifest.navEntry` to build the sidebar, filtered by each module's enabled state (stored in Mongo, toggleable from Settings).
- Core mounts each module's API routes under a consistent `/api/modules/<id>/*` prefix so a disabled module simply isn't mounted, and calls `onDisable` before unmounting.
- A module that declares `requiredSecrets` can't be enabled until Secret Manager has values for all of them — surface this as a "needs configuration" state in the UI rather than letting it fail at runtime.

Because every module is already isolated behind `ModuleContext` + the event bus (§2), this stays a thin loader, not the architecture itself. Revisit true hot-pluggable/dynamic modules after n8n Manager + one more module (e.g. Docker Manager) have both been built — by then the contract will be informed by two real examples instead of guesses, and the swap only touches `registry.ts`.

## 4. Core data model (MongoDB)

- `users` — single document for v1 (admin account: email, password hash).
- `settings` — key/value app-level config (theme, etc).
- `secrets` — encrypted at rest (AES-256, key from `SECRET_MANAGER_KEY` env var, never stored in the DB). Referenced by key name (e.g. `N8N_API_KEY`), not raw value, from module config.
- `modules` — `{ id, enabled, config }` per installed module — drives nav + route mounting.
- `activity_log` — deferred until a second module exists and cross-module activity is actually worth aggregating.

Module-owned collections (e.g. `n8n_executions_cache`) are namespaced by module id and declared in that module's `db/collections.ts`, not in core. Note the event bus (§2) is in-process and unpersisted by default — `activity_log` only comes into play if/when something needs a durable record of events, not as the event transport itself.

## 5. Build order

1. ✅ Next.js app shell + Mongo connection + `users`/`settings`/`secrets`/`modules` collections.
2. ✅ Kernel: `ModuleContext` builder (db/secrets/logger scoping) + in-process event bus.
3. ✅ Auth (single admin login) + session middleware.
4. ✅ Secret Manager UI (add/edit/reveal-once encrypted secrets) at `/dashboard/secrets`.
5. ✅ Module registry loader (`registry.ts`) + dynamic nav. (Config schema validation and an enable/disable toggle UI in Settings are not built yet — modules are enabled via `manifest.defaultEnabled` for now.)
6. ⬜ n8n Manager — built, then **removed completely** by user request (2026-08-01) after the connection never got fully working. Module folder, registry entry, `modules`/`secrets` DB records, and stale UI references were all deleted — n8n is no longer part of Dev Nexus. If it comes back later, the module contract itself is unaffected (proves the registry loader doesn't need per-module special-casing), and n8n's public API has no generic "run workflow now" endpoint — only `/workflows/{id}/activate`/`/deactivate` — worth remembering if this is rebuilt.
7. Instead, **AI Assistant** (`src/modules/ai-assistant/`) and **Gmail** (`src/modules/gmail/`) became the real second and third modules, built directly (the user chose to jump to these over the Phase 2 lineup — see VISION.md/roadmap notes). Both are live: AI Assistant has multi-provider chat with real tool-calling (Notes CRUD + Gmail) and a confirmation gate for sensitive tools; Gmail has a working OAuth connection (read + label + send scopes). This required zero changes to the kernel or Notes — confirms the contract in §2 is holding up as intended.

**Next.js version gotcha hit during (3):** this project is on Next.js 16, which renamed the `middleware.ts` file convention to `proxy.ts` (function `middleware` → `proxy`) and changed its default runtime from Edge to Node.js. Confirmed via `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — per AGENTS.md, always check the installed docs before assuming a convention from training data. Auth's route-protection logic lives in `src/proxy.ts`.
