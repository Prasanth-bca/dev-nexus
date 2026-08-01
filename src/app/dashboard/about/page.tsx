import {
  Boxes,
  Check,
  Info,
  KeyRound,
  Layers,
  type LucideIcon,
  Radio,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { getModules } from "@/modules/loaded";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";

/** Capabilities a module opts into via the kernel contract — read off the live module object. */
function capabilitiesOf(mod: { search?: unknown; widget?: unknown; healthCheck?: unknown }): string[] {
  const caps: string[] = [];
  if (mod.search) caps.push("Search");
  if (mod.widget) caps.push("Widget");
  if (mod.healthCheck) caps.push("Health check");
  return caps;
}

const PLATFORM_CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Layers,
    title: "Modular kernel",
    body: "Every feature is a self-contained module registered against a typed contract. Modules receive database access, secrets, an event bus, and a scoped logger through an injected context — they never reach for globals or for each other.",
  },
  {
    icon: Search,
    title: "Global search",
    body: "Modules opt into a single search interface, so one query spans notes, conversations, email, repositories, and files. Adding a searchable module requires no changes to the search page itself.",
  },
  {
    icon: Terminal,
    title: "Command palette",
    body: "Ctrl+K opens navigation, search, and actions in one surface — create a note, start a conversation, switch theme, or sign out without touching the mouse.",
  },
  {
    icon: Boxes,
    title: "Composable dashboard",
    body: "Each module contributes a widget describing its own state. The dashboard renders whatever is installed and enabled, with no central list to maintain.",
  },
  {
    icon: Radio,
    title: "Event bus",
    body: "Modules publish domain events instead of calling one another. The Activity module is built entirely on this, and later modules can subscribe without any existing module being modified.",
  },
  {
    icon: KeyRound,
    title: "Secret manager",
    body: "Third-party credentials are encrypted at rest with AES-256-GCM and retrieved through the module context, so integration code never handles raw key material.",
  },
];

const SECURITY_NOTES: string[] = [
  "Passwords hashed with scrypt; sessions are HMAC-signed tokens in HttpOnly cookies",
  "Third-party credentials encrypted at rest with AES-256-GCM under a key held outside the database",
  "Untrusted email HTML converted to plain text rather than rendered, closing an obvious injection path",
  "Uploads stored under generated identifiers so user-supplied filenames never touch the filesystem",
  "Destructive AI actions blocked behind an explicit approval step",
];

const STACK: { label: string; value: string }[] = [
  { label: "Framework", value: "Next.js (App Router)" },
  { label: "Language", value: "TypeScript" },
  { label: "Database", value: "MongoDB" },
  { label: "Styling", value: "Tailwind CSS, shadcn/ui" },
  { label: "Embeddings", value: "On-device, via Transformers.js" },
  { label: "Deployment", value: "Local machine" },
];

export default async function AboutPage() {
  const loaded = await getModules();
  const modules = loaded.filter((m) => m.module.manifest.description);

  return (
    <div className="animate-fade-in mx-auto max-w-5xl pb-4">
      <PageHeader title="About" description="What Dev Nexus is, and how it is put together." icon={Info} />

      {/* Overview */}
      <section className="glass mb-8 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-lg font-bold text-white shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
            N
          </span>
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">One platform. Complete developer control.</h2>
            <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
              Dev Nexus is a personal developer operations platform: a single, self-hosted workspace that consolidates the
              tools a working developer touches every day — notes and knowledge, AI assistance, email, source control, file
              storage, and an audit trail of it all.
            </p>
            <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
              It exists to remove context switching. Rather than moving between half a dozen browser tabs and desktop
              applications, each capability is a module inside one interface, sharing one search, one command palette, one
              credential store, and one activity history. It runs entirely on the local machine, and the data stays there.
            </p>
          </div>
        </div>
      </section>

      {/* Modules — read from the live registry so this never drifts from what's installed. */}
      <section className="mb-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Modules</h2>
          <span className="text-sm text-muted-foreground">
            {modules.length} installed
          </span>
        </div>

        <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
          {modules.map(({ module }, i) => {
            const { manifest } = module;
            const Icon = getModuleIcon(manifest.icon);
            const accent = getModuleAccent(manifest.id);
            const caps = capabilitiesOf(module);

            return (
              <Card
                key={manifest.id}
                style={{ "--accent": accent, "--i": i } as React.CSSProperties}
                className="lift relative hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70"
                />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                      <Icon className="h-4 w-4 text-[var(--accent)]" />
                    </span>
                    <span className="text-[15px] font-medium">{manifest.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">v{manifest.version}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-3.5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{manifest.description}</p>

                  {manifest.highlights && manifest.highlights.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {manifest.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm leading-relaxed">
                          <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                          <span className="text-muted-foreground">{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {caps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                      {caps.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground dark:bg-white/[0.06]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Platform capabilities */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Platform</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PLATFORM_CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-foreground/[0.04] dark:bg-white/[0.05]">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <h3 className="text-sm font-medium">{title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security + stack */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--module-secrets)_25%,transparent)] bg-[color-mix(in_srgb,var(--module-secrets)_12%,transparent)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--module-secrets)]" />
            </span>
            <h2 className="text-sm font-medium">Security posture</h2>
          </div>
          <ul className="flex flex-col gap-2.5">
            {SECURITY_NOTES.map((note) => (
              <li key={note} className="flex items-start gap-2 text-sm leading-relaxed">
                <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--module-secrets)]" />
                <span className="text-muted-foreground">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">Built with</h2>
          <dl className="flex flex-col gap-2.5">
            {STACK.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
