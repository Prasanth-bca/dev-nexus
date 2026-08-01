import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** CSS colour (usually a `var(--module-*)`) tinting the icon halo. */
  accent?: string;
  className?: string;
}

/** Standard empty state — every list/collection view in Dev Nexus should render this instead of a bare "no items" line. */
export function EmptyState({ icon: Icon, title, description, action, accent = "var(--primary)", className }: EmptyStateProps) {
  return (
    <div
      style={{ "--accent": accent } as React.CSSProperties}
      className={cn("animate-fade-in flex flex-col items-center justify-center gap-4 py-16 text-center", className)}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        {/* Soft accent halo behind the icon — blurred once, never animated. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-[0.18] blur-xl"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
          <Icon className="h-6 w-6 text-[var(--accent)]" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-balance text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
