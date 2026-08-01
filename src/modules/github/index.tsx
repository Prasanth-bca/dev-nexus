import { listRepos } from "@/lib/integrations/github";
import type { DevNexusModule } from "@/lib/kernel/types";
import { formatRelativeTime } from "@/lib/format";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { GithubPage } from "./client/GithubPage";

export const githubModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <GithubPage ctx={ctx} /> }],
    };
  },

  async search(_ctx, query) {
    try {
      const q = query.toLowerCase();
      const repos = await listRepos(100);
      return repos
        .filter((r) => `${r.fullName} ${r.description ?? ""}`.toLowerCase().includes(q))
        .slice(0, 8)
        .map((r) => ({
          id: String(r.id),
          title: r.fullName,
          description: r.description ?? undefined,
          url: `/dashboard/github?repo=${encodeURIComponent(r.fullName)}`,
        }));
    } catch {
      // Not connected, or the request failed — omit GitHub results rather than failing the whole search.
      return [];
    }
  },

  async widget() {
    try {
      const repos = await listRepos(100);
      return {
        stat: { label: "Repos", value: repos.length },
        items: repos.slice(0, 4).map((r) => ({
          id: String(r.id),
          label: r.fullName,
          sublabel: formatRelativeTime(r.updatedAt),
          href: `/dashboard/github?repo=${encodeURIComponent(r.fullName)}`,
        })),
        emptyMessage: "No repositories found.",
        href: "/dashboard/github",
      };
    } catch {
      return {
        items: [],
        emptyMessage: "Connect GitHub in Settings to see your repos here.",
        href: "/dashboard/github",
      };
    }
  },
};
