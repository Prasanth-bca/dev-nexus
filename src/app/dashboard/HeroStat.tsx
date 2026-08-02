import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";

/**
 * A Server Component, not a Client Component — `load` runs entirely on the server.
 * Passing a function prop only works because both this component and its caller
 * (the Dashboard page) stay on the server side of the boundary; nothing here is ever
 * sent to the client except the resolved number `AnimatedCounter` receives.
 */
export async function HeroStat({
  label,
  icon: Icon,
  accent,
  load,
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  load: () => Promise<number>;
}) {
  const value = await load();

  return (
    <div
      style={{ "--accent": accent } as React.CSSProperties}
      className="glass flex items-center gap-3 rounded-xl px-4 py-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-lg leading-none font-semibold tabular-nums">
          <AnimatedCounter value={value} />
        </span>
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function HeroStatSkeleton() {
  return (
    <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06] dark:bg-white/[0.08]" />
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-10 animate-pulse rounded bg-foreground/[0.06] dark:bg-white/[0.08]" />
        <div className="h-3 w-16 animate-pulse rounded bg-foreground/[0.05] dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}
