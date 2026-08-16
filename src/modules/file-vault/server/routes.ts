import { ObjectId } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { categorize, FILE_VAULT_COLLECTION, toDTO, type FileVaultDoc } from "../db/collections";
import { deleteStoredFile, readStoredFile, saveFile } from "./storage";

const MAX_SIZE = 25 * 1024 * 1024;

/**
 * Uploads accept any file type — that's the point of a general-purpose vault — but the
 * uploader-supplied MIME type is untrusted, and this module's own manifest promises "inline
 * preview for images and PDFs; download for everything else." The old code served every file
 * inline with whatever Content-Type the browser claimed at upload time, which meant uploading
 * something as image/svg+xml or text/html and opening its content URL executed script in the
 * app's own origin — a stored XSS. SVG is deliberately excluded from "image/*" here even
 * though it matches the prefix, since an SVG can embed a <script> that runs when rendered
 * inline the same as raw HTML can.
 */
function isSafeToRenderInline(mimeType: string): boolean {
  if (mimeType === "application/pdf") return true;
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

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

        // Defensive ceiling, not real pagination — no "load more" UI exists client-side, so
        // this is set far above any realistic personal file count.
        const docs = await collection().find(filter).sort({ uploadedAt: -1 }).limit(1000).toArray();
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
          const disposition = isSafeToRenderInline(doc.mimeType) ? "inline" : "attachment";
          return new Response(new Uint8Array(buffer), {
            headers: {
              "Content-Type": doc.mimeType,
              "Content-Disposition": `${disposition}; filename="${doc.filename.replace(/"/g, "")}"`,
              "Content-Length": String(doc.size),
              // Matches the avatar route's precedent — auth-gated content, so private, and
              // storage keys are fresh UUIDs never reused/mutated in place, so this is safe
              // to cache without a revalidation risk.
              "Cache-Control": "private, max-age=300",
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
