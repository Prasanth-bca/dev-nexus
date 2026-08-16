import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { NOTES_COLLECTION, type NoteDoc, type NoteDTO } from "../db/collections";
import { NotesWorkspace } from "./NotesWorkspace";

export async function NotesPage({ ctx }: { ctx: ModuleContext }) {
  // Same defensive limit + embedding projection as this module's own GET / route (see
  // server/routes.ts) — this SSR loader was fetching every note's full document, including
  // its 384-dim embedding vector, on every single page load, which was strictly worse than
  // the API route it duplicates.
  const items = await ctx.db
    .collection<NoteDoc>(NOTES_COLLECTION)
    .find({}, { projection: { embedding: 0 } })
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(1000)
    .toArray();

  const initialNotes: NoteDTO[] = items.map((note) => ({
    _id: note._id.toString(),
    title: note.title,
    content: note.content,
    category: note.category,
    tags: note.tags,
    pinned: note.pinned,
    favorite: note.favorite,
    summary: note.summary,
    summaryGeneratedAt: note.summaryGeneratedAt?.toISOString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <NotesWorkspace initialNotes={initialNotes} />
    </Suspense>
  );
}
