import { Suspense } from "react";
import Link from "next/link";
import { FolderGit2, FolderKanban, KeyRound, LayoutGrid, Mail, MessageSquarePlus, Plus, Upload, Vault } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getEnabledModuleCount,
  getGreetingName,
  getModuleStatValue,
  getModulesOnce,
  getSecretCount,
  timeOfDayGreeting,
} from "./dashboard-data";
import { HeroStat, HeroStatSkeleton } from "./HeroStat";
import { ModuleWidgetSlot, WidgetCardSkeleton } from "./ModuleWidgetSlot";

const QUICK_ACTIONS = [
  { label: "New Project", href: "/dashboard/projects?new=1", icon: FolderKanban, accent: "var(--module-projects)" },
  { label: "New Note", href: "/dashboard/notes?new=1", icon: Plus, accent: "var(--module-notes)" },
  { label: "New Chat", href: "/dashboard/ai-assistant?new=1", icon: MessageSquarePlus, accent: "var(--module-ai)" },
  { label: "Upload File", href: "/dashboard/file-vault", icon: Upload, accent: "var(--module-vault)" },
  { label: "Store Secret", href: "/dashboard/secrets", icon: KeyRound, accent: "var(--module-secrets)" },
];

/**
 * Widget grid layout — a fixed 12-column arrangement for the six real modules rather
 * than a generic system, since the set of modules and their natural card sizes (Activity
 * wants width for its sparkline, File Vault wants width for thumbnails) are known ahead
 * of time. New modules fall back to a plain 4-column tile via the `default` span below.
 */
const GRID_SPANS: Record<string, string> = {
  "ai-assistant": "col-span-12 lg:col-span-6",
  activity: "col-span-12 lg:col-span-6",
  notes: "col-span-12 md:col-span-6 lg:col-span-4",
  gmail: "col-span-12 md:col-span-6 lg:col-span-4",
  github: "col-span-12 md:col-span-6 lg:col-span-4",
  "file-vault": "col-span-12",
  projects: "col-span-12 md:col-span-6 lg:col-span-4",
};
const DEFAULT_SPAN = "col-span-12 md:col-span-6 lg:col-span-4";

export default async function DashboardHome() {
  const loaded = await getModulesOnce();
  const moduleIds = loaded.filter((m) => m.enabled && m.module.widget).map((m) => m.module.manifest.id);
  const [name, greeting] = [await getGreetingName(), timeOfDayGreeting()];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Hero */}
      <section className="animate-fade-in-up glass rounded-xl p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Good {greeting}, {name}
              </h1>
              <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your workspace.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{ "--accent": action.accent } as React.CSSProperties}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-1.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:text-[var(--accent)]"
                  )}
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Suspense fallback={<HeroStatSkeleton />}>
              <HeroStat label="Modules Active" icon={LayoutGrid} accent="var(--primary)" load={getEnabledModuleCount} />
            </Suspense>
            <Suspense fallback={<HeroStatSkeleton />}>
              <HeroStat label="Unread" icon={Mail} accent="var(--module-gmail)" load={() => getModuleStatValue("gmail")} />
            </Suspense>
            <Suspense fallback={<HeroStatSkeleton />}>
              <HeroStat label="Repos" icon={FolderGit2} accent="var(--module-github)" load={() => getModuleStatValue("github")} />
            </Suspense>
            <Suspense fallback={<HeroStatSkeleton />}>
              <HeroStat label="Secrets" icon={KeyRound} accent="var(--module-secrets)" load={getSecretCount} />
            </Suspense>
            <Suspense fallback={<HeroStatSkeleton />}>
              <HeroStat label="Files" icon={Vault} accent="var(--module-vault)" load={() => getModuleStatValue("file-vault")} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Module widgets — each tile streams in independently as its own data resolves. */}
      {moduleIds.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-xl p-12 text-center">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No widgets yet</p>
          <p className="text-sm text-muted-foreground">Enable a module to see its activity here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {moduleIds.map((id) => (
            <div key={id} className={GRID_SPANS[id] ?? DEFAULT_SPAN}>
              <Suspense fallback={<WidgetCardSkeleton />}>
                <ModuleWidgetSlot moduleId={id} />
              </Suspense>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
