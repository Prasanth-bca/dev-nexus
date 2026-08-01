import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardWidget } from "@/lib/kernel/types";

interface DashboardWidgetCardProps {
  title: string;
  icon: LucideIcon;
  widget: DashboardWidget;
}

/** Every module's Dashboard widget renders through this one card shape — small, scannable, and consistent regardless of what the module actually tracks. */
export function DashboardWidgetCard({ title, icon: Icon, widget }: DashboardWidgetCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {widget.stat && (
          <CardAction>
            <Badge variant="secondary">
              {widget.stat.value} {widget.stat.label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-0.5">
        {widget.items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{widget.emptyMessage}</p>
        ) : (
          widget.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="-mx-2 flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
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
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}
