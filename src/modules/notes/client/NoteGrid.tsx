"use client";

import { StickyNote } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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
    <div className="@container min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes found"
          description="Nothing matches the current filter. Try a different search, or create a new note."
          accent="var(--module-notes)"
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-3">
          {notes.map((note, i) => (
            <div key={note._id} style={{ "--i": i } as React.CSSProperties}>
              <NoteCard
                note={note}
                active={note._id === selectedId}
                onSelect={() => onSelect(note._id)}
                onTogglePin={() => onTogglePin(note._id)}
                onToggleFavorite={() => onToggleFavorite(note._id)}
                onRequestDelete={() => onRequestDelete(note._id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
