import { ObjectId, type Document } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { ToolDef } from "./providers";

/**
 * Reaches directly into the Notes module's collection by name rather than through
 * events/an exposed interface — same deliberate shortcut noted in ARCHITECTURE.md §2 as a
 * crack in "modules never know about each other." Acceptable for one integration; if a third
 * module needs to touch Notes' data, this should become a real shared interface instead.
 */
const NOTES_COLLECTION = "notes_items";

interface NoteDoc extends Document {
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const NOTE_TOOLS: ToolDef[] = [
  {
    name: "search_notes",
    description:
      "Search or list the user's notes. Omit query (or pass an empty string) to list notes without a keyword filter — this is " +
      "the right call for requests like 'list my notes' or 'show my pinned notes', not just for keyword search. Combine with " +
      "pinned/favorite to narrow the list. Returns up to 10 matches, most recently updated first, including id/title/category/" +
      "tags/pinned/favorite/snippet for each.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to search for across title, content, and tags. Omit to list all notes." },
        pinned: { type: "boolean", description: "If true, only pinned notes; if false, only unpinned. Omit for either." },
        favorite: { type: "boolean", description: "If true, only favorited notes; if false, only non-favorited. Omit for either." },
      },
    },
  },
  {
    name: "create_note",
    description: "Create a new note in the user's Notes module.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Markdown content" },
        category: { type: "string", description: "One of: Development, Ideas, Learning, Meeting, Personal (optional)" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note by id. Only include the fields being changed.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_note",
    description: "Permanently delete a note by id. Only call this when the user has clearly asked to delete that specific note.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

export async function runNoteTool(ctx: ModuleContext, name: string, args: Record<string, unknown>): Promise<string> {
  const collection = ctx.db.collection<NoteDoc>(NOTES_COLLECTION);

  switch (name) {
    case "search_notes": {
      const query = String(args.query ?? "").toLowerCase();
      const notes = await collection.find({}).sort({ updatedAt: -1 }).limit(200).toArray();
      const matches = notes
        .filter((n) => `${n.title} ${n.content} ${n.tags.join(" ")}`.toLowerCase().includes(query))
        .filter((n) => typeof args.pinned !== "boolean" || n.pinned === args.pinned)
        .filter((n) => typeof args.favorite !== "boolean" || n.favorite === args.favorite)
        .slice(0, 10)
        .map((n) => ({
          id: n._id.toString(),
          title: n.title,
          category: n.category,
          tags: n.tags,
          pinned: n.pinned,
          favorite: n.favorite,
          snippet: n.content.slice(0, 200),
        }));
      return JSON.stringify(matches);
    }

    case "create_note": {
      const now = new Date();
      const doc: NoteDoc = {
        title: typeof args.title === "string" ? args.title : "Untitled",
        content: typeof args.content === "string" ? args.content : "",
        category: typeof args.category === "string" ? args.category : "",
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        pinned: false,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      };
      const result = await collection.insertOne(doc);
      ctx.events.emit("notes.created", { id: result.insertedId.toString(), title: doc.title, source: "ai-assistant" });
      return JSON.stringify({ id: result.insertedId.toString(), ...doc });
    }

    case "update_note": {
      const id = String(args.id ?? "");
      if (!ObjectId.isValid(id)) return JSON.stringify({ error: "Invalid note id." });

      const update: Partial<NoteDoc> = { updatedAt: new Date() };
      if (typeof args.title === "string") update.title = args.title;
      if (typeof args.content === "string") update.content = args.content;
      if (typeof args.category === "string") update.category = args.category;
      if (Array.isArray(args.tags)) update.tags = args.tags.map(String);

      const result = await collection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: "after" });
      if (!result) return JSON.stringify({ error: "Note not found." });
      ctx.events.emit("notes.updated", { id, source: "ai-assistant" });
      return JSON.stringify(result);
    }

    case "delete_note": {
      const id = String(args.id ?? "");
      if (!ObjectId.isValid(id)) return JSON.stringify({ error: "Invalid note id." });
      const deleted = await collection.findOneAndDelete({ _id: new ObjectId(id) });
      if (!deleted) return JSON.stringify({ error: "Note not found." });
      ctx.events.emit("notes.deleted", { id, title: deleted.title, source: "ai-assistant" });
      return JSON.stringify({ ok: true });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
