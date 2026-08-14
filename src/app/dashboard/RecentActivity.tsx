import Link from "next/link";
import { getModuleWidgetData } from "./dashboard-data";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";

/**
 * A compact list, not cards — Activity already aggregates every module's events via the
 * kernel event bus (see activity/index.tsx), so this is the same widget() data the old
 * dashboard's Activity card showed, just rendered as rows instead of a tile.
 */
export async function RecentActivity() {
  const data = await getModuleWidgetData("activity");
  const accent = getModuleAccent("activity");
  const Icon = getModuleIcon("History");

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Recent Activity</h2>
        <Link href="/dashboard/activity" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          View all
        </Link>
      </div>

      <div className="glass rounded-xl p-2">
        {!data ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Activity is unavailable right now.</p>
        ) : data.widget.items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{data.widget.emptyMessage}</p>
        ) : (
          <ul className="stagger flex flex-col">
            {data.widget.items.map((item, i) => (
              <li key={item.id} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
                >
                  <span
                    style={{ "--accent": accent } as React.CSSProperties}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  >
                    <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  {item.sublabel && <span className="shrink-0 text-xs text-muted-foreground">{item.sublabel}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function RecentActivitySkeleton() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10">
      <div className="mb-3 h-3 w-28 animate-pulse rounded bg-foreground/[0.06] dark:bg-white/[0.08]" />
      <div className="glass flex flex-col gap-2 rounded-xl p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-foreground/[0.05] dark:bg-white/[0.06]" />
        ))}
      </div>
    </section>
  );
}
