import { ObjectId } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { categorize, FILE_VAULT_COLLECTION, toDTO, type FileVaultDoc } from "../db/collections";
import { deleteStoredFile, readStoredFile, saveFile } from "./storage";

const MAX_SIZE = 25 * 1024 * 1024;

function parseId(raw: string): ObjectId | null {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  const collection = () => ctx.db.collection<FileVaultDoc>(FILE_VAULT_COLLECTION);

  return [
    {
      method: "GET",
      path: "/files",
      handler: async (req) => {
        const url = new URL(req.url);
        const q = url.searchParams.get("q")?.trim();
        const category = url.searchParams.get("category");
        const projectId = url.searchParams.get("projectId");

        const filter: Record<string, unknown> = {};
        if (category && category !== "all") filter.category = category;
        if (q) filter.filename = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        if (projectId) filter.projectId = projectId;

        const docs = await collection().find(filter).sort({ uploadedAt: -1 }).toArray();
        return Response.json(docs.map((d) => toDTO(d._id.toString(), d)));
      },
    },
    {
      method: "POST",
      path: "/files",
      handler: async (req) => {
        const form = await req.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "No file provided." }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
          return Response.json({ error: "File is larger than 25MB." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storageKey = await saveFile(buffer, file.name);
        const mimeType = file.type || "application/octet-stream";
        const doc: FileVaultDoc = {
          filename: file.name || "untitled",
          storageKey,
          mimeType,
          size: file.size,
          category: categorize(mimeType),
          uploadedAt: new Date(),
        };
        const projectId = form?.get("projectId");
        if (typeof projectId === "string" && projectId.trim()) doc.projectId = projectId.trim();

        const { insertedId } = await collection().insertOne(doc);
        ctx.events.emit("file-vault.uploaded", { id: insertedId.toString(), filename: doc.filename });
        return Response.json(toDTO(insertedId.toString(), doc), { status: 201 });
      },
    },
    {
      method: "GET",
      path: "/files/:id/content",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "File not found." }, { status: 404 });

        const doc = await collection().findOne({ _id });
        if (!doc) return Response.json({ error: "File not found." }, { status: 404 });

        try {
          const buffer = await readStoredFile(doc.storageKey);
          return new Response(new Uint8Array(buffer), {
            headers: {
              "Content-Type": doc.mimeType,
              "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
              "Content-Length": String(doc.size),
            },
          });
        } catch {
          return Response.json({ error: "File content is missing on disk." }, { status: 404 });
        }
      },
    },
    {
      method: "PUT",
      path: "/files/:id",
      handler: async (req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "File not found." }, { status: 404 });

        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const projectId = typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;

        const result = await collection().findOneAndUpdate(
          { _id },
          projectId ? { $set: { projectId } } : { $unset: { projectId: "" } },
          { returnDocument: "after" }
        );
        if (!result) return Response.json({ error: "File not found." }, { status: 404 });

        return Response.json(toDTO(result._id.toString(), result));
      },
    },
    {
      method: "DELETE",
      path: "/files/:id",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "File not found." }, { status: 404 });

        const doc = await collection().findOne({ _id });
        if (!doc) return Response.json({ error: "File not found." }, { status: 404 });

        await collection().deleteOne({ _id });
        await deleteStoredFile(doc.storageKey);
        ctx.events.emit("file-vault.deleted", { id: params.id, filename: doc.filename });
        return Response.json({ ok: true });
      },
    },
  ];
}
