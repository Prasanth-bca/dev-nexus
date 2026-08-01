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
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        Related Notes
      </div>
      <div className="stagger flex flex-col gap-1">
        {related.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onOpenNote(n.id)}
            style={{ "--i": i } as React.CSSProperties}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2 text-left text-xs transition-all duration-200 hover:translate-x-0.5 hover:border-[color-mix(in_srgb,var(--module-notes)_30%,transparent)] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
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
