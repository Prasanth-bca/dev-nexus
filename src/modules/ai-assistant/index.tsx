import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { AiAssistantPage } from "./client/AiAssistantPage";
import { CONVERSATIONS_COLLECTION, PROVIDERS_COLLECTION, type ConversationDoc } from "./db/collections";

export const aiAssistantModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <AiAssistantPage ctx={ctx} /> }],
    };
  },

  async onEnable(ctx) {
    try {
      await ctx.db.collection(CONVERSATIONS_COLLECTION).createIndex({ updatedAt: -1 });

      // Enforces "at most one active provider" as a real database constraint, not just app-level
      // logic — see the isDuplicateKeyError() catch in server/routes.ts's POST /providers. A
      // partial unique index only constrains documents where active:true, so any number of
      // inactive providers can coexist; it also still serves providers().findOne({active:true}),
      // which runs on every chat message. Migrates a pre-existing plain (non-unique) index on the
      // same field from an earlier version of this module, since MongoDB rejects creating a
      // differently-specced index on a key pattern that's already indexed.
      const providersCollection = ctx.db.collection(PROVIDERS_COLLECTION);
      const staleActiveIndex = (await providersCollection.indexes()).find(
        (idx) => Object.keys(idx.key).length === 1 && "active" in idx.key && !idx.unique
      );
      if (staleActiveIndex?.name) await providersCollection.dropIndex(staleActiveIndex.name);
      await providersCollection.createIndex({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });
    } catch (err) {
      // Silently ignore errors during index creation (collections may not exist yet)
      ctx.logger.info(`Index creation warning: ${err instanceof Error ? err.message : String(err)}`);
    }

    ctx.logger.info("enabled");
  },

  async search(ctx, query) {
    const q = query.toLowerCase();
    const conversations = await ctx.db.collection<ConversationDoc>(CONVERSATIONS_COLLECTION).find({}).limit(100).toArray();
    return conversations
      .filter((c) => {
        const text = `${c.title} ${c.messages.map((m) => m.content ?? "").join(" ")}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8)
      .map((c) => ({
        id: c._id.toString(),
        title: c.title,
        description: "AI conversation",
        url: `/dashboard/ai-assistant?conversation=${c._id.toString()}`,
      }));
  },

  async widget(ctx) {
    try {
      const collection = ctx.db.collection<ConversationDoc>(CONVERSATIONS_COLLECTION);
      const [total, recent] = await Promise.all([
        collection.estimatedDocumentCount(),
        collection.find({}).sort({ updatedAt: -1 }).limit(4).toArray(),
      ]);
      return {
        stat: { label: "Conversations", value: total },
        items: recent.map((c) => ({
          id: c._id.toString(),
          label: c.title || "Untitled conversation",
          sublabel: formatRelativeTime(c.updatedAt),
          href: `/dashboard/ai-assistant?conversation=${c._id.toString()}`,
        })),
        emptyMessage: "No conversations yet — ask it something.",
        href: "/dashboard/ai-assistant",
      };
    } catch {
      // Collection doesn't exist yet (fresh database)
      return {
        stat: { label: "Conversations", value: 0 },
        items: [],
        emptyMessage: "No conversations yet — ask it something.",
        href: "/dashboard/ai-assistant",
      };
    }
  },
};
