import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { deleteSecret, setSecret } from "@/lib/kernel/secrets";
import {
  getRepo,
  invalidateGithubToken,
  listBranches,
  listCommits,
  listIssues,
  listPullRequests,
  listRepos,
  verifyToken,
} from "@/lib/integrations/github";

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/status",
      handler: async () => {
        try {
          const token = await ctx.secrets.get("GITHUB_TOKEN");
          const { login, scopes } = await verifyToken(token);
          return Response.json({ connected: true, username: login, scopes });
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
          const { login, scopes } = await verifyToken(token);
          await setSecret("GITHUB_TOKEN", token);
          invalidateGithubToken();
          ctx.events.emit("github.connected", {});
          return Response.json({ ok: true, username: login, scopes });
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
        invalidateGithubToken();
        ctx.events.emit("github.disconnected", {});
        return Response.json({ ok: true });
      },
    },
    {
      method: "GET",
      path: "/repos",
      handler: async (req) => {
        const params = new URL(req.url).searchParams;
        const q = params.get("q")?.trim().toLowerCase();
        const filter = params.get("filter") ?? "all";
        try {
          let repos = await listRepos(100);
          if (filter === "public") repos = repos.filter((r) => !r.private);
          else if (filter === "private") repos = repos.filter((r) => r.private);
          else if (filter === "owner") repos = repos.filter((r) => r.relationship === "owner");
          else if (filter === "collaborator") repos = repos.filter((r) => r.relationship === "collaborator");
          else if (filter === "organization") repos = repos.filter((r) => r.relationship === "organization");
          if (q) repos = repos.filter((r) => `${r.fullName} ${r.description ?? ""}`.toLowerCase().includes(q));
          return Response.json(repos);
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
