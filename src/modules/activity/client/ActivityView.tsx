"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, FileX, FolderGit2, History, Mail, MailX, Send, Tag, Trash2, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
    <div className="flex flex-col gap-4">
      <PageHeader title="Activity" description="A running history of what's happened across Dev Nexus." />

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Actions across Dev Nexus — new notes, uploads, sent emails — will show up here."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groups).map(([day, items]) => (
            <div key={day} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium text-muted-foreground">{day}</h2>
              <div className="flex flex-col gap-1">
                {items.map((e) => {
                  const Icon = TYPE_ICON[e.type] ?? History;
                  const row = (
                    <div className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm transition-colors hover:border-border hover:bg-accent/50">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="flex-1 truncate">{e.summary}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(e.timestamp)}</span>
                    </div>
                  );
                  return e.href ? (
                    <Link key={e.id} href={e.href}>
                      {row}
                    </Link>
                  ) : (
                    <div key={e.id}>{row}</div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore} className="self-center">
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
