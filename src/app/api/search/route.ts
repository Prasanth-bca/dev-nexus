import { getModules } from "@/modules/loaded";
import type { SearchResultItem } from "@/lib/kernel/types";

interface GroupedResult extends SearchResultItem {
  group: string;
}

const STATIC_DESTINATIONS: Array<{ id: string; title: string; description: string; url: string; keywords: string[] }> = [
  { id: "dashboard", title: "Dashboard", description: "Overview of installed modules", url: "/dashboard", keywords: ["dashboard", "home", "overview"] },
  { id: "settings", title: "Settings", description: "Account email & password", url: "/dashboard/settings", keywords: ["settings", "account", "password", "email", "profile"] },
  { id: "secrets", title: "Secret Manager", description: "Encrypted API keys and credentials", url: "/dashboard/secrets", keywords: ["secrets", "api key", "credentials", "token"] },
];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const qLower = q.toLowerCase();

  const loaded = await getModules();

  // With no query, still return "Go to" nav — this is what lets the Command Palette show
  // useful quick-nav the moment it opens, before the user has typed anything.
  const moduleNavResults: GroupedResult[] = loaded
    .filter((m) => m.enabled && m.module.manifest.navEntry && (!q || m.module.manifest.name.toLowerCase().includes(qLower)))
    .map((m) => ({
      id: `module-${m.module.manifest.id}`,
      title: m.module.manifest.name,
      description: "Module",
      url: m.module.manifest.navEntry!.path,
      group: "Go to",
    }));

  const staticResults: GroupedResult[] = STATIC_DESTINATIONS.filter(
    (d) => !q || d.title.toLowerCase().includes(qLower) || d.keywords.some((k) => k.includes(qLower))
  ).map((d) => ({ id: `static-${d.id}`, title: d.title, description: d.description, url: d.url, group: "Go to" }));

  if (!q) {
    return Response.json({ results: [...moduleNavResults, ...staticResults] });
  }

  const perModuleResults = await Promise.all(
    loaded
      .filter((m) => m.enabled && m.module.search && m.ctx)
      .map(async (m): Promise<GroupedResult[]> => {
        try {
          const results = await m.module.search!(m.ctx!, q);
          return results.map((r) => ({ ...r, group: m.module.manifest.name }));
        } catch {
          return [];
        }
      })
  );

  return Response.json({ results: [...moduleNavResults, ...staticResults, ...perModuleResults.flat()] });
}
