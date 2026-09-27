import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Module icon — rendered in an accent-tinted tile beside the title. */
  icon?: LucideIcon;
  /** CSS colour (usually a `var(--module-*)`) driving the icon tile and title glow. */
  accent?: string;
  className?: string;
}

/** Standard page header — title/description on the left, actions on the right. Every module page uses this. */
export function PageHeader({ title, description, actions, icon: Icon, accent = "var(--primary)", className }: PageHeaderProps) {
  return (
    <div
      style={{ "--accent": accent } as React.CSSProperties}
      className={cn("mb-3 flex items-start justify-between gap-4", className)}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
            <Icon className="h-5 w-5 text-[var(--accent)]" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
