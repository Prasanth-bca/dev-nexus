"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { formatRelativeTime } from "@/lib/format";
import type { ProjectDTO } from "../../db/collections";
import type { ActivityDTO } from "../../../activity/db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

export function ActivityTab({ project }: Props) {
  const [events, setEvents] = useState<ActivityDTO[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Deferred out of the effect body so the setState-then-fetch kickoff doesn't run
    // synchronously within the effect — same pattern used across the app's other
    // list-loading effects (Activity, Gmail, GitHub, Command Palette).
    const timeout = setTimeout(() => {
      setLoading(true);
      setEvents(null);
      fetch(`/api/modules/projects/${project._id}/activity?limit=50`)
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled) setEvents(Array.isArray(json) ? json : []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [project._id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2.5 py-2">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Notes and files created for this project will show up here."
        accent={ACCENT}
      />
    );
  }

  return (
    <div className="stagger flex flex-col gap-0.5" style={{ "--accent": ACCENT } as React.CSSProperties}>
      {events.map((event, i) => {
        const row = (
          <div
            style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
            className="group/row flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--background))] transition-transform duration-200 ease-out group-hover/row:scale-105">
              <History className="h-4 w-4 text-[var(--accent)]" />
            </span>

            <span className="min-w-0 flex-1 truncate">{event.summary}</span>

            <span className="shrink-0 rounded-full border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums dark:bg-white/[0.05]">
              {formatRelativeTime(event.timestamp)}
            </span>

            {event.href && (
              <ChevronRight
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
              />
            )}
          </div>
        );

        return event.href ? (
          <Link key={event.id} href={event.href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            {row}
          </Link>
        ) : (
          <div key={event.id}>{row}</div>
        );
      })}
    </div>
  );
}
