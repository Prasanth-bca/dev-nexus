"use client";

import type { NoteDTO } from "../db/collections";
import { NoteCard } from "./NoteCard";

export function NoteGrid({
  notes,
  selectedId,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onRequestDelete,
}: {
  notes: NoteDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  return (
    <div className="@container flex-1 min-w-0 min-h-0 overflow-y-auto p-3">
      {notes.length === 0 ? (
        <div className="text-sm text-zinc-400 px-3 py-10 text-center">No notes found.</div>
      ) : (
        <div className="grid grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              active={note._id === selectedId}
              onSelect={() => onSelect(note._id)}
              onTogglePin={() => onTogglePin(note._id)}
              onToggleFavorite={() => onToggleFavorite(note._id)}
              onRequestDelete={() => onRequestDelete(note._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
