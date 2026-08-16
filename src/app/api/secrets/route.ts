import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { listSecretNames, setSecret } from "@/lib/kernel/secrets";

// proxy.ts already gates every /api/secrets/** request behind auth, but that's the only
// thing standing between an unauthenticated request and encrypted credential values — a
// future route added under a slightly different path, or an edited matcher, would silently
// lose that protection with no fallback here to catch it. Checking again in-handler is cheap
// defense-in-depth for data this sensitive.
export async function GET(req: Request) {
  if (!(await getCurrentUserId())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId");
  const names = await listSecretNames();
  return Response.json(projectId ? names.filter((n) => n.projectId === projectId) : names);
}

export async function POST(req: Request) {
  if (!(await getCurrentUserId())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!/^[A-Z0-9_]+$/.test(name)) {
    return Response.json({ error: "Name must be UPPER_SNAKE_CASE (e.g. GMAIL_CLIENT_ID)." }, { status: 400 });
  }
  if (!value) {
    return Response.json({ error: "Value is required." }, { status: 400 });
  }

  await setSecret(name, value);
  return Response.json({ ok: true }, { status: 201 });
}
