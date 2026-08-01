import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { deleteSecret, setSecret } from "@/lib/kernel/secrets";
import { getRepo, listBranches, listCommits, listIssues, listPullRequests, listRepos, verifyToken } from "@/lib/integrations/github";

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/status",
      handler: async () => {
        try {
          const token = await ctx.secrets.get("GITHUB_TOKEN");
          const { login } = await verifyToken(token);
          return Response.json({ connected: true, username: login });
        } catch {
          return Response.json({ connected: false });
        }
      },
    },
    {
      method: "POST",
      path: "/token",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const token = typeof body.token === "string" ? body.token.trim() : "";
        if (!token) return Response.json({ error: "A personal access token is required." }, { status: 400 });
        try {
          const { login } = await verifyToken(token);
          await setSecret("GITHUB_TOKEN", token);
          ctx.events.emit("github.connected", {});
          return Response.json({ ok: true, username: login });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not verify token." }, { status: 400 });
        }
      },
    },
    {
      method: "POST",
      path: "/disconnect",
      handler: async () => {
        await deleteSecret("GITHUB_TOKEN");
        ctx.events.emit("github.disconnected", {});
        return Response.json({ ok: true });
      },
    },
    {
      method: "GET",
      path: "/repos",
      handler: async (req) => {
        const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
        try {
          const repos = await listRepos(100);
          const filtered = q ? repos.filter((r) => `${r.fullName} ${r.description ?? ""}`.toLowerCase().includes(q)) : repos;
          return Response.json(filtered);
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load repositories." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/repos/:owner/:repo",
      handler: async (_req, params) => {
        try {
          return Response.json(await getRepo(params.owner, params.repo));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load repository." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/repos/:owner/:repo/branches",
      handler: async (_req, params) => {
        try {
          return Response.json(await listBranches(params.owner, params.repo));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load branches." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/repos/:owner/:repo/commits",
      handler: async (req, params) => {
        const branch = new URL(req.url).searchParams.get("branch") ?? undefined;
        try {
          return Response.json(await listCommits(params.owner, params.repo, branch));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load commits." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/repos/:owner/:repo/pulls",
      handler: async (_req, params) => {
        try {
          return Response.json(await listPullRequests(params.owner, params.repo));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load pull requests." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/repos/:owner/:repo/issues",
      handler: async (_req, params) => {
        try {
          return Response.json(await listIssues(params.owner, params.repo));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load issues." }, { status: 502 });
        }
      },
    },
  ];
}
