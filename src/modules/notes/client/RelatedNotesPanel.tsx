"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RelatedNote } from "../db/collections";

export function RelatedNotesPanel({ noteId, onOpenNote }: { noteId: string; onOpenNote: (id: string) => void }) {
  const [related, setRelated] = useState<RelatedNote[] | null>(null);

  useEffect(() => {
    fetch(`/api/modules/notes/${noteId}/related`)
      .then((res) => res.json())
      .then(setRelated);
    // Component is remounted (via `key={noteId}` at the call site) whenever noteId changes,
    // so `related` always starts fresh at null — no manual reset needed here.
  }, [noteId]);

  if (related === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        Related Notes
      </div>
      <div className="flex flex-col gap-1">
        {related.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onOpenNote(n.id)}
            className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs hover:bg-muted/50"
          >
            <span className="truncate">{n.title || "Untitled"}</span>
            {n.category && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {n.category}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
