import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import type { DashboardWidget } from "@/lib/kernel/types";

interface DashboardWidgetCardProps {
  title: string;
  icon: LucideIcon;
  widget: DashboardWidget;
  /** CSS colour (usually a `var(--module-*)`) — drives the top border, icon tile, and stat pill. */
  accent?: string;
}

/** Every module's Dashboard widget renders through this one card shape — small, scannable, and consistent regardless of what the module actually tracks. */
export function DashboardWidgetCard({ title, icon: Icon, widget, accent = "var(--primary)" }: DashboardWidgetCardProps) {
  return (
    <Card
      style={{ "--accent": accent } as React.CSSProperties}
      className="lift relative h-full hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
    >
      {/* Accent hairline across the top — the module's identity at a glance. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70"
      />

      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
            <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          </span>
          <span className="text-sm font-medium">{title}</span>
          {widget.stat && (
            <span className="ml-auto rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              {widget.stat.value} {widget.stat.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      {/* Only ever rendered when the module supplies real history (currently just
          Activity) — see the `trend` doc comment on DashboardWidget. */}
      {widget.trend && widget.trend.length > 1 && (
        <div className="-mt-2 px-6">
          <Sparkline data={widget.trend} accent={accent} />
        </div>
      )}

      <CardContent className="flex flex-col gap-0.5">
        {widget.items.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">{widget.emptyMessage}</p>
        ) : (
          widget.items.map((item, i) => (
            <Link
              key={item.id}
              href={item.href}
              style={{ "--i": i } as React.CSSProperties}
              className="-mx-2 flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
            >
              <span className="truncate text-sm">{item.label}</span>
              {item.sublabel && <span className="truncate text-xs text-muted-foreground">{item.sublabel}</span>}
            </Link>
          ))
        )}
      </CardContent>

      <CardFooter>
        <Link
          href={widget.href}
          className="group/link flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[var(--accent)]"
        >
          View all
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover/link:translate-x-0.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
