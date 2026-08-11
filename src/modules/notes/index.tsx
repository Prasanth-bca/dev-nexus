import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { warmUpEmbeddings } from "@/lib/integrations/embeddings";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { NotesPage } from "./client/NotesPage";
import { NOTES_COLLECTION, type NoteDoc } from "./db/collections";

export const notesModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <NotesPage ctx={ctx} /> }],
    };
  },

  async onEnable(ctx) {
    await ctx.db.collection(NOTES_COLLECTION).createIndex({ pinned: -1, updatedAt: -1 });
    // GET / filters by projectId when a project is selected — sparse since most notes aren't assigned to one.
    await ctx.db.collection(NOTES_COLLECTION).createIndex({ projectId: 1 }, { sparse: true });
    // Kicks off the embedding model's (one-time) download/load in the background at server
    // start, so a user's first Semantic Search isn't the request that pays for it.
    warmUpEmbeddings();
    ctx.logger.info("enabled");
  },

  async healthCheck(ctx) {
    await ctx.db.collection(NOTES_COLLECTION).estimatedDocumentCount();
    return { ok: true };
  },

  async search(ctx, query) {
    const q = query.toLowerCase();
    // Projected — title/content/tags are all this substring-matches or returns; excluding
    // embedding (a large float array) and the other unused fields cuts what Command Palette
    // pulls into memory on every keystroke query.
    const notes = await ctx.db
      .collection<NoteDoc>(NOTES_COLLECTION)
      .find({}, { projection: { title: 1, content: 1, tags: 1 } })
      .limit(200)
      .toArray();
    return notes
      .filter((n) => `${n.title} ${n.content} ${n.tags.join(" ")}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((n) => ({
        id: n._id.toString(),
        title: n.title || "Untitled",
        description: n.content.slice(0, 120),
        url: `/dashboard/notes?open=${n._id.toString()}`,
      }));
  },

  async widget(ctx) {
    const collection = ctx.db.collection<NoteDoc>(NOTES_COLLECTION);
    const [total, recent] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.find({}).sort({ updatedAt: -1 }).limit(4).toArray(),
    ]);
    return {
      stat: { label: "Notes", value: total },
      items: recent.map((n) => ({
        id: n._id.toString(),
        label: n.title || "Untitled",
        sublabel: formatRelativeTime(n.updatedAt),
        href: `/dashboard/notes?open=${n._id.toString()}`,
      })),
      emptyMessage: "No notes yet — create your first one.",
      href: "/dashboard/notes",
    };
  },
};
