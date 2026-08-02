import type { ModuleContext } from "@/lib/kernel/context";
import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { ActivityPage } from "./client/ActivityPage";
import { ACTIVITY_COLLECTION, TRACKED_EVENT_TYPES, toDTO, type ActivityDoc } from "./db/collections";

declare global {
  var _devNexusActivitySubscribed: boolean | undefined;
}

/**
 * Real daily event counts for the last 7 days (oldest first) — powers the Dashboard
 * widget's sparkline. Deliberately the only module with a `trend`: it's the only one
 * that actually keeps a timestamped history to derive one from.
 */
async function computeSevenDayTrend(ctx: ModuleContext): Promise<number[]> {
  const collection = ctx.db.collection<ActivityDoc>(ACTIVITY_COLLECTION);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  // $dateToString defaults to UTC, matching the UTC slice below — consistency between
  // the two, not local-timezone accuracy, is what keeps a day's count under the right key.
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
    ])
    .toArray();

  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const trend: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return trend;
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
    const [total, recent, trend] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.find({}).sort({ timestamp: -1 }).limit(4).toArray(),
      computeSevenDayTrend(ctx),
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
      trend,
    };
  },
};
