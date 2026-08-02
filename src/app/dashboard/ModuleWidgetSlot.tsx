import { AlertTriangle } from "lucide-react";
import { DashboardWidgetCard } from "@/components/dashboard-widget-card";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";
import { getModuleWidgetData } from "./dashboard-data";

/**
 * Fetches and renders exactly one module's widget card. Each instance of this on the
 * page sits behind its own <Suspense> boundary, so a slow module (a flaky Gmail/GitHub
 * call) only blocks its own tile — not the rest of the dashboard. This is the actual
 * fix for "loads all module data at once": before, one Promise.all() over every module
 * had to fully settle before any HTML left the server.
 */
export async function ModuleWidgetSlot({ moduleId }: { moduleId: string }) {
  const data = await getModuleWidgetData(moduleId);

  if (!data) {
    // The module is disabled, has no widget, or its widget() threw (e.g. a down
    // integration) — render a small notice in the reserved slot rather than a gap.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{moduleId} is unavailable right now.</p>
      </div>
    );
  }

  return (
    <DashboardWidgetCard
      title={data.title}
      icon={getModuleIcon(data.iconName)}
      widget={data.widget}
      accent={getModuleAccent(moduleId)}
    />
  );
}

export function WidgetCardSkeleton() {
  return (
    <div className="glass flex h-full flex-col gap-4 rounded-xl p-4">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06] dark:bg-white/[0.08]" />
        <div className="h-4 w-24 animate-pulse rounded bg-foreground/[0.06] dark:bg-white/[0.08]" />
        <div className="ml-auto h-5 w-14 animate-pulse rounded-full bg-foreground/[0.06] dark:bg-white/[0.08]" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-3.5 w-full animate-pulse rounded bg-foreground/[0.05] dark:bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}
