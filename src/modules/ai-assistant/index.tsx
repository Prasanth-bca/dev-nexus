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
    await ctx.db.collection(CONVERSATIONS_COLLECTION).createIndex({ updatedAt: -1 });
    // providers().findOne({active:true}) runs on every chat message (see server/routes.ts).
    await ctx.db.collection(PROVIDERS_COLLECTION).createIndex({ active: 1 });
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
  },
};
