"use client";

import { Pin, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { NoteDTO } from "../db/collections";

const ACCENT = "var(--module-notes)";

function CardAction({
  label,
  active,
  onClick,
  danger,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "text-[var(--accent)] opacity-100"
          : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08]"
      )}
    >
      {children}
    </span>
  );
}

export function NoteCard({
  note,
  active,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onRequestDelete,
}: {
  note: NoteDTO;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex h-[150px] cursor-pointer flex-col gap-1.5 rounded-xl p-3.5 text-left",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--card))]"
          : "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      {/* Left accent rail, revealed on selection. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full bg-[var(--accent)] transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0"
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <CardAction label={note.pinned ? "Unpin note" : "Pin note"} active={note.pinned} onClick={onTogglePin}>
            <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-current")} />
          </CardAction>
          <CardAction
            label={note.favorite ? "Remove from favorites" : "Add to favorites"}
            active={note.favorite}
            onClick={onToggleFavorite}
          >
            <Star className={cn("h-3.5 w-3.5", note.favorite && "fill-current")} />
          </CardAction>
          <CardAction label="Delete note" danger onClick={onRequestDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </CardAction>
        </div>
      </div>

      {note.content && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{note.content}</p>}

      <div className="mt-auto flex flex-col gap-1.5">
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {note.category ? (
            <span className="truncate rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
              {note.category}
            </span>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
