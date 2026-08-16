import { getModules } from "@/modules/loaded";
import type { HttpMethod, RouteDefinition } from "@/lib/kernel/types";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";

function matchRoute(routes: RouteDefinition[], method: HttpMethod, pathSegments: string[]) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const routeSegments = route.path.split("/").filter(Boolean);
    if (routeSegments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < routeSegments.length; i++) {
      const rs = routeSegments[i];
      const ps = pathSegments[i];
      if (rs.startsWith(":")) {
        params[rs.slice(1)] = ps;
      } else if (rs !== ps) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}

type RouteContext = { params: Promise<{ moduleId: string; path?: string[] }> };

async function handle(req: Request, method: HttpMethod, routeCtx: RouteContext): Promise<Response> {
  // proxy.ts already gates every /api/modules/** request behind auth — this is a single
  // dispatcher for all module routes, so one defense-in-depth check here covers every module's
  // API surface, same reasoning as /api/secrets/**.
  if (!(await getCurrentUserId())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, path } = await routeCtx.params;
  const loaded = await getModules();
  const found = loaded.find((m) => m.module.manifest.id === moduleId);

  if (!found || !found.enabled) {
    return Response.json({ error: "module not found or disabled" }, { status: 404 });
  }

  const match = matchRoute(found.registration.routes, method, path ?? []);
  if (!match) {
    return Response.json({ error: "route not found" }, { status: 404 });
  }

  return match.route.handler(req, match.params);
}

export async function GET(req: Request, ctx: RouteContext) {
  return handle(req, "GET", ctx);
}
export async function POST(req: Request, ctx: RouteContext) {
  return handle(req, "POST", ctx);
}
export async function PUT(req: Request, ctx: RouteContext) {
  return handle(req, "PUT", ctx);
}
export async function DELETE(req: Request, ctx: RouteContext) {
  return handle(req, "DELETE", ctx);
}
