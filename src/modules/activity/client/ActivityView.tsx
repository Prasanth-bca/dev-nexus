"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  FileX,
  FolderGit2,
  History,
  Mail,
  MailX,
  Send,
  Tag,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getModuleAccent } from "@/lib/icon-map";
import type { ActivityEvent } from "./types";

const PAGE_SIZE = 50;

const TYPE_ICON: Record<string, LucideIcon> = {
  "notes.created": FileText,
  "notes.deleted": FileX,
  "file-vault.uploaded": Upload,
  "file-vault.deleted": Trash2,
  "gmail.email.sent": Send,
  "gmail.email.labeled": Tag,
  "gmail.connected": Mail,
  "gmail.disconnected": MailX,
  "github.connected": FolderGit2,
  "github.disconnected": FolderGit2,
};

const OWN_ACCENT = getModuleAccent("activity");

/**
 * Colour-code each entry by the module that emitted it, keyed off the event type's
 * prefix ("notes.created" → notes). Events from modules without an accent fall back
 * to Activity's own, so the timeline still reads as one surface.
 */
const EVENT_ACCENT: Record<string, string> = {
  notes: getModuleAccent("notes"),
  "file-vault": getModuleAccent("file-vault"),
  gmail: getModuleAccent("gmail"),
  github: getModuleAccent("github"),
};

function accentForType(type: string): string {
  return EVENT_ACCENT[type.split(".")[0]] ?? OWN_ACCENT;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ActivityView() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // setTimeout(…, 0) defers the setState-then-fetch kickoff out of the effect body itself —
    // same pattern used across the app's other list-loading effects (Gmail, GitHub, Command Palette).
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/activity/events?limit=${PAGE_SIZE}`)
        .then((res) => res.json())
        .then((data) => {
          const list: ActivityEvent[] = Array.isArray(data) ? data : [];
          setEvents(list);
          setHasMore(list.length === PAGE_SIZE);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function loadMore() {
    if (!events || events.length === 0) return;
    setLoadingMore(true);
    const before = events[events.length - 1].timestamp;
    fetch(`/api/modules/activity/events?limit=${PAGE_SIZE}&before=${encodeURIComponent(before)}`)
      .then((res) => res.json())
      .then((data) => {
        const list: ActivityEvent[] = Array.isArray(data) ? data : [];
        setEvents((prev) => [...(prev ?? []), ...list]);
        setHasMore(list.length === PAGE_SIZE);
      })
      .finally(() => setLoadingMore(false));
  }

  const groups = (events ?? []).reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const key = dayLabel(e.timestamp);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity"
        description="A running history of what's happened across Dev Nexus."
        icon={History}
        accent={OWN_ACCENT}
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Actions across Dev Nexus — new notes, uploads, sent emails — will show up here."
          accent={OWN_ACCENT}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {Object.entries(groups).map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{day}</h2>
                <span className="rounded-full border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums dark:bg-white/[0.05]">
                  {items.length}
                </span>
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>

              <div className="relative">
                {/* The connector threading the day's entries together. Purely decorative,
                    fades in with the group, and never intercepts pointer events. */}
                <span
                  aria-hidden
                  className="animate-fade-in pointer-events-none absolute top-4 bottom-4 left-[30px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border to-transparent"
                />

                <div className="stagger relative flex flex-col gap-0.5">
                  {items.map((e, i) => {
                    const Icon = TYPE_ICON[e.type] ?? History;
                    const accent = accentForType(e.type);
                    const row = (
                      <div
                        style={{ "--accent": accent } as React.CSSProperties}
                        className="group/row flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
                      >
                        {/* Mixed against --background rather than transparent so the tile
                            stays opaque and visually breaks the connector line behind it. */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--background))] transition-transform duration-200 ease-out group-hover/row:scale-105">
                          <Icon className="h-4 w-4 text-[var(--accent)]" />
                        </span>

                        <span className="min-w-0 flex-1 truncate">{e.summary}</span>

                        <span className="hidden shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] md:inline-block">
                          {e.moduleId}
                        </span>

                        <span className="shrink-0 rounded-full border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums dark:bg-white/[0.05]">
                          {timeLabel(e.timestamp)}
                        </span>

                        {e.href && (
                          <ChevronRight
                            aria-hidden
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
                          />
                        )}
                      </div>
                    );
                    return e.href ? (
                      <Link
                        key={e.id}
                        href={e.href}
                        style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                        className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div key={e.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                        {row}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}

          {hasMore && (
            <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore} className="h-11 self-center px-4 sm:h-9">
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
