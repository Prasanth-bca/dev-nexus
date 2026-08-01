import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { ACTIVITY_COLLECTION, toDTO, type ActivityDoc } from "../db/collections";

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/events",
      handler: async (req) => {
        const url = new URL(req.url);
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
        const before = url.searchParams.get("before");

        const filter: Record<string, unknown> = {};
        if (before) {
          const date = new Date(before);
          if (!Number.isNaN(date.getTime())) filter.timestamp = { $lt: date };
        }

        const docs = await ctx.db
          .collection<ActivityDoc>(ACTIVITY_COLLECTION)
          .find(filter)
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();

        return Response.json(docs.map((d) => toDTO(d._id.toString(), d)));
      },
    },
  ];
}
