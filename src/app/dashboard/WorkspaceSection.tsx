import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { getModulesOnce } from "./dashboard-data";
import { ModuleWidgetSlot, WidgetCardSkeleton } from "./ModuleWidgetSlot";
import { CONTINUE_WORKING_IDS } from "./ContinueWorking";

/**
 * Every other enabled module with a widget, as a uniform preview grid — the redesign spec's
 * "lightweight previews, not full module UI." Reuses ModuleWidgetSlot (and therefore
 * DashboardWidgetCard) exactly as the old dashboard did, so per-module error isolation and
 * independent Suspense streaming carry over unchanged; only the layout is new.
 */
export async function WorkspaceSection() {
  const loaded = await getModulesOnce();
  const moduleIds = loaded
    .filter((m) => m.enabled && m.module.widget && !CONTINUE_WORKING_IDS.includes(m.module.manifest.id))
    .map((m) => m.module.manifest.id);

  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Your Workspace</h2>

      {moduleIds.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-xl p-12 text-center">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No other modules yet</p>
          <p className="text-sm text-muted-foreground">Enable a module to see its activity here.</p>
        </div>
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moduleIds.map((id, i) => (
            <div key={id} style={{ "--i": i } as React.CSSProperties}>
              <Suspense fallback={<WidgetCardSkeleton />}>
                <ModuleWidgetSlot moduleId={id} />
              </Suspense>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
