import { Suspense } from "react";
import { getModulesOnce } from "./dashboard-data";
import { ModuleWidgetSlot, WidgetCardSkeleton } from "./ModuleWidgetSlot";

/** Modules most likely to hold work in progress — shown first and larger than the rest of
 *  the workspace grid. Kept out of WorkspaceSection below so nothing renders twice. */
export const CONTINUE_WORKING_IDS = ["projects", "ai-assistant", "notes"];

export async function ContinueWorking() {
  const loaded = await getModulesOnce();
  const ids = CONTINUE_WORKING_IDS.filter((id) => loaded.some((m) => m.enabled && m.module.manifest.id === id && m.module.widget));
  if (ids.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Continue Working</h2>
      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        {ids.map((id, i) => (
          <div key={id} style={{ "--i": i } as React.CSSProperties}>
            <Suspense fallback={<WidgetCardSkeleton />}>
              <ModuleWidgetSlot moduleId={id} />
            </Suspense>
          </div>
        ))}
      </div>
    </section>
  );
}
