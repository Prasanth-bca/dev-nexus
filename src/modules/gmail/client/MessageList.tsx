"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Mail } from "lucide-react";
import type { EmailSummary } from "./types";

function formatDate(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MessageList({
  messages,
  loading,
  selectedId,
  onSelect,
}: {
  messages: EmailSummary[] | null;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-md border p-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="No emails found"
        description="Nothing here yet — try a different search, or check back once new mail arrives."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {messages.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
            selectedId === m.id
              ? "border-primary bg-accent"
              : "border-transparent hover:border-border hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"}`}>{m.from || "(unknown sender)"}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(m.date)}</span>
          </div>
          <span className={`truncate text-sm ${m.unread ? "font-medium" : "text-muted-foreground"}`}>{m.subject || "(no subject)"}</span>
          <span className="truncate text-xs text-muted-foreground">{m.snippet}</span>
        </button>
      ))}
    </div>
  );
}
