import type { ObjectId } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import { embedText } from "@/lib/integrations/embeddings";
import { NOTES_COLLECTION, type NoteDoc } from "../db/collections";

/**
 * Best-effort and fire-and-forget from every call site — never throws. Note create/update must
 * never fail or slow down just because the embedding model isn't loaded yet; the note saves
 * regardless, and simply won't show up in Semantic Search results until it's (re)indexed.
 */
export async function reembedNote(ctx: ModuleContext, id: ObjectId, title: string, content: string): Promise<void> {
  const text = `${title}\n\n${content}`.trim();
  if (!text) return;
  try {
    const embedding = await embedText(text);
    await ctx.db.collection<NoteDoc>(NOTES_COLLECTION).updateOne({ _id: id }, { $set: { embedding, embeddingUpdatedAt: new Date() } });
  } catch (err) {
    ctx.logger.warn(`embedding failed for note ${id.toString()}`, { error: err instanceof Error ? err.message : String(err) });
  }
}
