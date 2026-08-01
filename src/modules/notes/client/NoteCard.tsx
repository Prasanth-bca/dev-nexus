"use client";

import type { NoteDTO } from "../db/collections";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
    <button
      type="button"
      onClick={onSelect}
      className={`h-[140px] w-full text-left p-3 rounded-lg border flex flex-col transition-all duration-200 ${
        active
          ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500/25 shadow-sm"
          : "border-zinc-200 dark:border-zinc-800 hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm truncate">{note.title || "Untitled"}</div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`text-xs ${note.pinned ? "opacity-100" : "opacity-30 hover:opacity-70"}`}
            title="Pin"
          >
            📌
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`text-xs ${note.favorite ? "opacity-100" : "opacity-30 hover:opacity-70"}`}
            title="Favorite"
          >
            ⭐
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="text-xs opacity-30 hover:opacity-100 hover:text-red-600"
            title="Delete"
          >
            🗑
          </span>
        </div>
      </div>

      {note.category && (
        <span className="inline-block w-fit mt-1 text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          {note.category}
        </span>
      )}

      {note.tags.length > 0 && (
        <div className="mt-1.5 text-[11px] text-zinc-400 truncate">{note.tags.map((tag) => `#${tag}`).join(" ")}</div>
      )}

      <div className="mt-auto pt-1.5 text-[11px] text-zinc-400">{formatDate(note.updatedAt)}</div>
    </button>
  );
}
