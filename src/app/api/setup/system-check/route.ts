import { getDb } from "@/lib/kernel/db";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getSecretManagerKeyBase64, getSessionSecretBase64 } from "@/lib/kernel/instance-keys";

/** Confirms the two things a fresh install needs before anything else works —
 *  Mongo reachability and the auto-provisioned encryption/session keys — so the
 *  wizard's System Check step shows real verification, not just an assumption. */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    await getSecretManagerKeyBase64();
    await getSessionSecretBase64();
    return Response.json({ ok: true, mongoConnected: true, keysProvisioned: true });
  } catch (err) {
    return Response.json(
      { ok: false, mongoConnected: false, keysProvisioned: false, error: err instanceof Error ? err.message : "System check failed." },
      { status: 502 }
    );
  }
}
