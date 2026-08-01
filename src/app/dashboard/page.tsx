import { LayoutGrid, type LucideIcon } from "lucide-react";
import { getModules } from "@/modules/loaded";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DashboardWidgetCard } from "@/components/dashboard-widget-card";
import { Badge } from "@/components/ui/badge";
import { getModuleIcon } from "@/lib/icon-map";
import type { DashboardWidget } from "@/lib/kernel/types";

interface WidgetEntry {
  id: string;
  title: string;
  icon: LucideIcon;
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
            widget,
          };
        } catch {
          // A module's widget failing (e.g. an integration that's down) shouldn't blank the whole dashboard.
          return null;
        }
      })
    )
  ).filter((w): w is WidgetEntry => w !== null);

  return (
    <div>
      <PageHeader title="Dashboard" description="What's happening across Dev Nexus." />

      {widgets.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No widgets yet" description="Enable a module to see its activity here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <DashboardWidgetCard key={w.id} title={w.title} icon={w.icon} widget={w.widget} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Modules</h2>
        <div className="flex flex-wrap gap-2">
          {loaded.map(({ module, enabled }) => (
            <Badge key={module.manifest.id} variant={enabled ? "secondary" : "outline"}>
              {module.manifest.name} · {enabled ? "enabled" : "disabled"}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
