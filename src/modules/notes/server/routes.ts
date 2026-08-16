import { ObjectId } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { completeText } from "@/lib/integrations/ai";
import { cosineSimilarity, embedText } from "@/lib/integrations/embeddings";
import { NOTES_COLLECTION, type NoteDoc, type RelatedNote, type SemanticSearchResult } from "../db/collections";
import { CATEGORIES } from "../constants";
import { reembedNote } from "./embeddings";

/** LLMs asked for "only JSON" still sometimes wrap it in a markdown fence — strip that before parsing. */
function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

function parseId(raw: string): ObjectId | null {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

function sanitizeInput(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const category = typeof body.category === "string" ? body.category : "";
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
  const pinned = typeof body.pinned === "boolean" ? body.pinned : undefined;
  const favorite = typeof body.favorite === "boolean" ? body.favorite : undefined;
  return { title, content, category, tags, pinned, favorite };
}


export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  const collection = () => ctx.db.collection<NoteDoc>(NOTES_COLLECTION);

  return [
    {
      method: "GET",
      path: "/",
      handler: async (req) => {
        const projectId = new URL(req.url).searchParams.get("projectId");
        const filter: Record<string, unknown> = {};
        if (projectId) filter.projectId = projectId;
        // A defensive ceiling, not real pagination — the client has no "load more" UI, so this
        // is set far above any realistic personal note count rather than a true page size.
        const items = await collection()
          .find(filter, { projection: { embedding: 0 } })
          .sort({ pinned: -1, updatedAt: -1 })
          .limit(1000)
          .toArray();
        return Response.json(items);
      },
    },
    {
      method: "POST",
      path: "/",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const { title, content, category, tags } = sanitizeInput(body);
        if (!title) {
          return Response.json({ error: "title is required" }, { status: 400 });
        }
        const now = new Date();
        const note: NoteDoc = {
          title,
          content,
          category,
          tags,
          pinned: false,
          favorite: false,
          createdAt: now,
          updatedAt: now,
        };
        if (typeof body.projectId === "string" && body.projectId.trim()) note.projectId = body.projectId.trim();
        const result = await collection().insertOne(note);
        ctx.events.emit("notes.created", { id: result.insertedId.toString(), title: note.title });
        void reembedNote(ctx, result.insertedId, note.title, note.content);
        return Response.json({ ...note, _id: result.insertedId }, { status: 201 });
      },
    },
    {
      method: "PUT",
      path: "/:id",
      handler: async (req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const { title, content, category, tags, pinned, favorite } = sanitizeInput(body);

        const update: Partial<NoteDoc> = { updatedAt: new Date() };
        if (title) update.title = title;
        if (body.content !== undefined) update.content = content;
        if (body.category !== undefined) update.category = category;
        if (body.tags !== undefined) update.tags = tags;
        if (pinned !== undefined) update.pinned = pinned;
        if (favorite !== undefined) update.favorite = favorite;

        // projectId is three-way: absent in the body (don't touch it), "" (unassign), or a real id.
        const clearProject = "projectId" in body && !(typeof body.projectId === "string" && body.projectId.trim());
        if (typeof body.projectId === "string" && body.projectId.trim()) update.projectId = body.projectId.trim();

        const result = await collection().findOneAndUpdate(
          { _id },
          { $set: update, ...(clearProject ? { $unset: { projectId: "" } } : {}) },
          { returnDocument: "after", projection: { embedding: 0 } }
        );
        if (!result) return Response.json({ error: "not found" }, { status: 404 });

        ctx.events.emit("notes.updated", { id: params.id });
        if (update.title !== undefined || update.content !== undefined) {
          void reembedNote(ctx, _id, result.title, result.content);
        }
        return Response.json(result);
      },
    },
    {
      method: "DELETE",
      path: "/:id",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const deleted = await collection().findOneAndDelete({ _id });
        ctx.events.emit("notes.deleted", { id: params.id, title: deleted?.title });
        return Response.json({ ok: true });
      },
    },
    {
      method: "POST",
      path: "/:id/summarize",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const note = await collection().findOne({ _id });
        if (!note) return Response.json({ error: "not found" }, { status: 404 });
        if (!note.content.trim()) return Response.json({ error: "Note has no content to summarize." }, { status: 400 });

        try {
          const summary = await completeText(
            "Summarize the following developer note in 2-3 concise sentences. Plain text, no markdown, no preamble.",
            `Title: ${note.title}\n\n${note.content}`
          );
          const summaryGeneratedAt = new Date();
          await collection().updateOne({ _id }, { $set: { summary: summary.trim(), summaryGeneratedAt } });
          return Response.json({ summary: summary.trim(), summaryGeneratedAt: summaryGeneratedAt.toISOString() });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Summarization failed." }, { status: 502 });
        }
      },
    },
    {
      method: "POST",
      path: "/:id/suggest",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const note = await collection().findOne({ _id });
        if (!note) return Response.json({ error: "not found" }, { status: 404 });
        if (!note.title.trim() && !note.content.trim()) {
          return Response.json({ error: "Note has no title or content to work from." }, { status: 400 });
        }

        try {
          const raw = await completeText(
            `You suggest a category and tags for a developer's personal note. The category must be exactly one of: ${CATEGORIES.join(", ")}. Suggest 3-5 short, lowercase tags (single words or short phrases, no #). Respond with ONLY this JSON shape, nothing else: {"category": "...", "tags": ["...", "..."]}`,
            `Title: ${note.title}\n\n${note.content}`
          );
          const parsed = extractJson(raw) as { category?: unknown; tags?: unknown };
          const category = typeof parsed.category === "string" && (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : "";
          const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === "string").slice(0, 5) : [];
          return Response.json({ category, tags });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Suggestion failed." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/:id/related",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const note = await collection().findOne({ _id });
        if (!note) return Response.json({ error: "not found" }, { status: 404 });

        // Only title/category/tags are ever read below — same projection fix already applied
        // to this module's search()/widget() paths, just missed here (no reason to drag every
        // candidate's embedding vector along for a plain tag/category comparison).
        const others = await collection()
          .find(
            { _id: { $ne: _id }, $or: [{ category: note.category || "__none__" }, { tags: { $in: note.tags } }] },
            { projection: { title: 1, category: 1, tags: 1 } }
          )
          .toArray();

        const related: RelatedNote[] = others
          .map((o) => {
            const sharedTags = o.tags.filter((t) => note.tags.includes(t)).length;
            const sameCategory = note.category && o.category === note.category ? 1 : 0;
            return { note: o, score: sharedTags * 2 + sameCategory };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ note: o }) => ({ id: o._id.toString(), title: o.title, category: o.category, tags: o.tags }));

        return Response.json(related);
      },
    },
    {
      method: "GET",
      path: "/semantic-search",
      handler: async (req) => {
        const q = new URL(req.url).searchParams.get("q")?.trim();
        if (!q) return Response.json({ error: "q is required" }, { status: 400 });

        let queryEmbedding: number[];
        try {
          queryEmbedding = await embedText(q);
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Embedding request failed." }, { status: 502 });
        }

        // Projected to skip fields unused by scoring/display below — every note with an
        // embedding still has to be fetched to be scored (no vector index to pre-filter with),
        // so this trims per-document payload rather than the candidate set itself. The
        // limit(2000) is a stopgap, not a real fix — cosineSimilarity() still runs against
        // every candidate in a blocking loop, which is fine at hundreds of notes but will get
        // noticeably slower as this grows; a proper fix needs an actual vector index, which is
        // a bigger project than this patch.
        const notes = await collection()
          .find({ embedding: { $exists: true, $ne: [] } }, { projection: { title: 1, content: 1, embedding: 1 } })
          .limit(2000)
          .toArray();

        const results: SemanticSearchResult[] = notes
          .map((n) => ({
            id: n._id.toString(),
            title: n.title || "Untitled",
            snippet: n.content.slice(0, 160),
            score: cosineSimilarity(queryEmbedding, n.embedding!),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        return Response.json(results);
      },
    },
    {
      method: "POST",
      path: "/reindex-embeddings",
      handler: async () => {
        const candidates = (await collection().find({ embedding: { $exists: false } }).toArray()).filter(
          (n) => `${n.title}${n.content}`.trim()
        );

        let processed = 0;
        let failed = 0;
        for (const note of candidates) {
          try {
            const embedding = await embedText(`${note.title}\n\n${note.content}`.trim());
            await collection().updateOne({ _id: note._id }, { $set: { embedding, embeddingUpdatedAt: new Date() } });
            processed++;
          } catch {
            failed++;
          }
        }

        return Response.json({ processed, failed, total: candidates.length });
      },
    },
  ];
}
