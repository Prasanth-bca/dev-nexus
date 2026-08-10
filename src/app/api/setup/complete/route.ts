import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { completeSetup } from "@/lib/kernel/setup-state";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const skipped = Array.isArray(body.skipped) ? (body.skipped as unknown[]).filter((s): s is string => typeof s === "string") : [];

  await completeSetup(skipped);
  return Response.json({ ok: true });
}
