import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { ProjectsPage } from "./client/ProjectsPage";
import {
  PROJECTS_COLLECTION,
  PROJECT_MEETINGS_COLLECTION,
  PROJECT_LINKS_COLLECTION,
  PROJECT_CONTACTS_COLLECTION,
  PROJECT_ENVIRONMENTS_COLLECTION,
  type ProjectDoc,
} from "./db/collections";

export const projectsModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <ProjectsPage ctx={ctx} /> }],
    };
  },

  async onEnable(ctx) {
    await ctx.db.collection(PROJECTS_COLLECTION).createIndex({ slug: 1 }, { unique: true });
    await ctx.db.collection(PROJECTS_COLLECTION).createIndex({ updatedAt: -1 });
    // GET / filters by status/priority (see server/routes.ts) with no supporting index until
    // now — forced a collection scan, bounded only by that route's own limit(1000).
    await ctx.db.collection(PROJECTS_COLLECTION).createIndex({ status: 1, priority: 1 });
    await ctx.db.collection(PROJECT_MEETINGS_COLLECTION).createIndex({ projectId: 1, date: -1 });
    await ctx.db.collection(PROJECT_LINKS_COLLECTION).createIndex({ projectId: 1 });
    await ctx.db.collection(PROJECT_CONTACTS_COLLECTION).createIndex({ projectId: 1 });
    await ctx.db.collection(PROJECT_ENVIRONMENTS_COLLECTION).createIndex({ projectId: 1 });
    ctx.logger.info("enabled");
  },

  async healthCheck(ctx) {
    await ctx.db.collection(PROJECTS_COLLECTION).estimatedDocumentCount();
    return { ok: true };
  },

  async search(ctx, query) {
    const q = query.toLowerCase();
    const items = await ctx.db.collection<ProjectDoc>(PROJECTS_COLLECTION).find({}).limit(200).toArray();
    return items
      .filter((p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.techStack.join(" ")}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({
        id: p._id.toString(),
        title: p.name,
        description: p.description.slice(0, 120),
        url: `/dashboard/projects?project=${p.slug}`,
      }));
  },

  async widget(ctx) {
    try {
      const collection = ctx.db.collection<ProjectDoc>(PROJECTS_COLLECTION);
      const [total, recent] = await Promise.all([
        collection.estimatedDocumentCount(),
        collection.find({}).sort({ updatedAt: -1 }).limit(4).toArray(),
      ]);
      return {
        stat: { label: "Projects", value: total },
        items: recent.map((p) => ({
          id: p._id.toString(),
          label: p.name,
          sublabel: `${p.status} · ${formatRelativeTime(p.updatedAt)}`,
          href: `/dashboard/projects?project=${p.slug}`,
        })),
        emptyMessage: "No projects yet — create your first one.",
        href: "/dashboard/projects",
      };
    } catch {
      return {
        stat: { label: "Projects", value: 0 },
        items: [],
        emptyMessage: "No projects yet — create your first one.",
        href: "/dashboard/projects",
      };
    }
  },
};
