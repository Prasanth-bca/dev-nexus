import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { step, ok, info } from "../../shared/logger";
import { PROJECT_ROOT } from "../../shared/paths";

/**
 * Steps 5 & 8 — Database Initialization + Module Initialization.
 *
 * Each module's real index creation lives in its onEnable() hook (src/lib/kernel/loader.ts
 * calls it automatically, idempotently, the moment the app first boots — nothing further
 * to do there, by design). What this step *can* safely do standalone is seed the `modules`
 * collection doc every module needs, using the exact same atomic upsert loader.ts uses.
 *
 * It deliberately does NOT import src/modules/registry.ts (or any module's index.tsx) —
 * confirmed by testing that those files transitively import client React components (e.g.
 * notes/client/MarkdownPreview.tsx pulls in a highlight.js CSS file), which only Next.js's
 * own bundler knows how to load. A standalone script can't safely reach through them.
 * Instead it reads each module's manifest.ts directly — those are plain data objects with
 * no React/CSS imports (confirmed: every manifest.ts imports only `type ModuleManifest`) —
 * by discovering module folders on disk rather than hardcoding a list, so this step never
 * needs updating when a module is added.
 */
export async function run(): Promise<void> {
  step("Initializing database & modules…");

  const { getDb } = await import("@/lib/kernel/db");
  const db = await getDb();
  const modulesCollection = db.collection<{ id: string; enabled: boolean; config: unknown }>("modules");

  const modulesDir = path.join(PROJECT_ROOT, "src", "modules");
  const entries = readdirSync(modulesDir, { withFileTypes: true }).filter((e) => e.isDirectory());

  let seeded = 0;
  for (const entry of entries) {
    const manifestPath = path.join(modulesDir, entry.name, "manifest.ts");
    if (!existsSync(manifestPath)) continue;

    const mod = await import(`@/modules/${entry.name}/manifest`);
    const manifest = mod.manifest as { id: string; name: string; defaultEnabled?: boolean };

    const result = await modulesCollection.updateOne(
      { id: manifest.id },
      { $setOnInsert: { id: manifest.id, enabled: manifest.defaultEnabled ?? false, config: {} } },
      { upsert: true }
    );
    seeded++;
    info(`${manifest.name}${result.upsertedCount ? "" : " (already registered)"}`);
  }

  ok(`${seeded} module${seeded === 1 ? "" : "s"} registered`);
  info("Each module creates its own collection indexes automatically the first time you run `npm run dev`.");
}
