import type { DevNexusModule } from "@/lib/kernel/types";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { FileVaultPage } from "./client/FileVaultPage";
import { FILE_VAULT_COLLECTION, type FileVaultDoc } from "./db/collections";

export const fileVaultModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <FileVaultPage /> }],
    };
  },

  async onEnable(ctx) {
    await ctx.db.collection(FILE_VAULT_COLLECTION).createIndex({ uploadedAt: -1 });
    // GET /files filters by category and (when set) projectId — projectId sparse since most
    // files aren't assigned to one.
    await ctx.db.collection(FILE_VAULT_COLLECTION).createIndex({ category: 1 });
    await ctx.db.collection(FILE_VAULT_COLLECTION).createIndex({ projectId: 1 }, { sparse: true });
    ctx.logger.info("enabled");
  },

  async healthCheck(ctx) {
    await ctx.db.collection(FILE_VAULT_COLLECTION).estimatedDocumentCount();
    return { ok: true };
  },

  async search(ctx, query) {
    const q = query.toLowerCase();
    const files = await ctx.db
      .collection<FileVaultDoc>(FILE_VAULT_COLLECTION)
      .find({}, { projection: { filename: 1, size: 1 } })
      .limit(200)
      .toArray();
    return files
      .filter((f) => f.filename.toLowerCase().includes(q))
      .slice(0, 8)
      .map((f) => ({
        id: f._id.toString(),
        title: f.filename,
        description: formatBytes(f.size),
        url: `/dashboard/file-vault?open=${f._id.toString()}`,
      }));
  },

  async widget(ctx) {
    try {
      const collection = ctx.db.collection<FileVaultDoc>(FILE_VAULT_COLLECTION);
      const [total, recent] = await Promise.all([
        collection.estimatedDocumentCount(),
        collection.find({}).sort({ uploadedAt: -1 }).limit(4).toArray(),
      ]);
      return {
        stat: { label: "Files", value: total },
        items: recent.map((f) => ({
          id: f._id.toString(),
          label: f.filename,
          sublabel: `${formatBytes(f.size)} · ${formatRelativeTime(f.uploadedAt)}`,
          href: `/dashboard/file-vault?open=${f._id.toString()}`,
        })),
        emptyMessage: "No files yet — upload your first one.",
        href: "/dashboard/file-vault",
      };
    } catch {
      return {
        stat: { label: "Files", value: 0 },
        items: [],
        emptyMessage: "No files yet — upload your first one.",
        href: "/dashboard/file-vault",
      };
    }
  },
};
