import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { NOTES_COLLECTION, type NoteDoc, type NoteDTO } from "../db/collections";
import { NotesWorkspace } from "./NotesWorkspace";

export async function NotesPage({ ctx }: { ctx: ModuleContext }) {
  const items = await ctx.db.collection<NoteDoc>(NOTES_COLLECTION).find().sort({ pinned: -1, updatedAt: -1 }).toArray();

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
    <Suspense fallback={null}>
      <NotesWorkspace initialNotes={initialNotes} />
    </Suspense>
  );
}
