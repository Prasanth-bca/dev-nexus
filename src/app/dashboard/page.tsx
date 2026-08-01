import { LayoutGrid, type LucideIcon } from "lucide-react";
import { getModules } from "@/modules/loaded";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DashboardWidgetCard } from "@/components/dashboard-widget-card";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";
import type { DashboardWidget } from "@/lib/kernel/types";

interface WidgetEntry {
  id: string;
  title: string;
  icon: LucideIcon;
  accent: string;
  widget: DashboardWidget;
}

export default async function DashboardHome() {
  const loaded = await getModules();

  const widgets = (
    await Promise.all(
      loaded.map(async (m): Promise<WidgetEntry | null> => {
        if (!m.enabled || !m.module.widget || !m.ctx) return null;
        try {
          const widget = await m.module.widget(m.ctx);
          return {
            id: m.module.manifest.id,
            title: m.module.manifest.name,
            icon: getModuleIcon(m.module.manifest.icon),
            accent: getModuleAccent(m.module.manifest.id),
            widget,
          };
        } catch {
          // A module's widget failing (e.g. an integration that's down) shouldn't blank the whole dashboard.
          return null;
        }
      })
    )
  ).filter((w): w is WidgetEntry => w !== null);

  const enabledCount = loaded.filter((m) => m.enabled).length;

  return (
    <div className="animate-fade-in mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description={`${enabledCount} module${enabledCount === 1 ? "" : "s"} active — here's what's happening.`}
        icon={LayoutGrid}
      />

      {widgets.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No widgets yet" description="Enable a module to see its activity here." />
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {widgets.map((w, i) => (
            <div key={w.id} style={{ "--i": i } as React.CSSProperties}>
              <DashboardWidgetCard title={w.title} icon={w.icon} widget={w.widget} accent={w.accent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
