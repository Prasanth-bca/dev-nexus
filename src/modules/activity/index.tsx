import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { ActivityPage } from "./client/ActivityPage";
import { ACTIVITY_COLLECTION, TRACKED_EVENT_TYPES, toDTO, type ActivityDoc } from "./db/collections";

declare global {
  var _devNexusActivitySubscribed: boolean | undefined;
}

export const activityModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <ActivityPage /> }],
    };
  },

  async onEnable(ctx) {
    await ctx.db.collection(ACTIVITY_COLLECTION).createIndex({ timestamp: -1 });

    // The event bus is a process-wide singleton, but onEnable re-runs on every request in dev
    // (loader.ts rebuilds module registration each call) — without this guard, dev mode would
    // attach a fresh subscriber every time and log each event N times over.
    if (!global._devNexusActivitySubscribed) {
      global._devNexusActivitySubscribed = true;
      ctx.events.on("*", (payload, meta) => {
        if (!TRACKED_EVENT_TYPES.has(meta.type)) return;
        const doc: ActivityDoc = {
          type: meta.type,
          moduleId: meta.moduleId,
          payload: (payload ?? {}) as Record<string, unknown>,
          timestamp: new Date(meta.timestamp),
        };
        void ctx.db.collection<ActivityDoc>(ACTIVITY_COLLECTION).insertOne(doc);
      });
    }

    ctx.logger.info("enabled");
  },

  async healthCheck(ctx) {
    await ctx.db.collection(ACTIVITY_COLLECTION).estimatedDocumentCount();
    return { ok: true };
  },

  async widget(ctx) {
    const collection = ctx.db.collection<ActivityDoc>(ACTIVITY_COLLECTION);
    const [total, recent] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.find({}).sort({ timestamp: -1 }).limit(4).toArray(),
    ]);
    return {
      stat: { label: "Events", value: total },
      items: recent.map((d) => {
        const dto = toDTO(d._id.toString(), d);
        return {
          id: dto.id,
          label: dto.summary,
          sublabel: formatRelativeTime(dto.timestamp),
          href: dto.href ?? "/dashboard/activity",
        };
      }),
      emptyMessage: "No activity yet.",
      href: "/dashboard/activity",
    };
  },
};
