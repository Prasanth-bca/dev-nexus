"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";
import { formatRelativeTime } from "@/lib/format";
import type { ProjectDTO } from "../../db/collections";
import type { NoteDTO } from "../../../notes/db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

export function NotesTab({ project }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/notes?projectId=${project._id}`)
        .then((res) => res.json())
        .then((data) => setNotes(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, [project._id]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/modules/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, projectId: project._id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create note.");
        return;
      }
      router.push(`/dashboard/notes?open=${data._id}`);
    } catch {
      toast.error("Could not create note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {notes && notes.length > 0 ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : "No notes yet"}
        </p>
        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note title…"
              aria-label="New note title"
              className="h-8 w-48 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewTitle("");
                }
              }}
            />
            <Button type="submit" size="sm" disabled={submitting || !newTitle.trim()}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </form>
        ) : (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Note
          </Button>
        )}
      </div>

      {!notes || notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          accent={ACCENT}
          title="No notes linked to this project"
          description="Create a note to capture context, decisions, or TODOs for this project."
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note, i) => (
            <Link
              key={note._id}
              href={`/dashboard/notes?open=${note._id}`}
              style={{ "--i": i } as React.CSSProperties}
              className="glass lift flex h-[110px] flex-col gap-1.5 rounded-xl p-3.5"
            >
              <span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
              {note.content && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{note.content}</p>}
              <div className="mt-auto flex flex-col gap-1.5">
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 overflow-hidden">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
