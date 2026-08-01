"use client";

import { Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { EmailSummary } from "./types";

const ACCENT = getModuleAccent("gmail");

function formatDate(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Strips the `"Display Name" <addr@host>` wrapper down to something worth showing in a 320px column. */
function displayName(from: string) {
  const named = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (named?.[1] ?? from).trim() || from;
}

/** First alphanumeric of the sender — drives the little avatar tile. */
function initial(from: string) {
  return (displayName(from).match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase();
}

export function MessageList({
  messages,
  loading,
  selectedId,
  onSelect,
  emptyTitle = "No emails found",
  emptyDescription = "Nothing here yet — try a different search, or check back once new mail arrives.",
}: {
  messages: EmailSummary[] | null;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Supplied by InboxView so the empty state explains the *active filter*, not just "nothing found". */
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <EmptyState icon={Mail} accent={ACCENT} title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="stagger flex flex-col gap-0.5 p-2" style={{ "--accent": ACCENT } as React.CSSProperties}>
      {messages.map((m, i) => {
        const isSelected = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            aria-current={isSelected ? "true" : undefined}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "group relative flex min-h-11 w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left",
              "transition-[background-color,border-color,transform] duration-200 outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/40",
              isSelected
                ? "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                : "border-transparent hover:translate-x-0.5 hover:border-border hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
            )}
          >
            {/* Selected rail — opacity-only so switching rows never reflows the list. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-[var(--accent)] transition-opacity duration-200",
                isSelected ? "opacity-100" : "opacity-0"
              )}
            />

            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-200",
                m.unread
                  ? "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                  : "border-border bg-foreground/[0.04] text-muted-foreground dark:bg-white/[0.05]"
              )}
            >
              {initial(m.from || "?")}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                {m.unread && (
                  <>
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span className="sr-only">Unread —</span>
                  </>
                )}
                <span className={cn("truncate text-sm", m.unread ? "font-semibold text-foreground" : "font-medium")}>
                  {displayName(m.from || "(unknown sender)")}
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatDate(m.date)}</span>
              </span>
              <span className={cn("truncate text-sm", m.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                {m.subject || "(no subject)"}
              </span>
              <span className="truncate text-xs text-muted-foreground/80">{m.snippet}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
