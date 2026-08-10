import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { reopenSetup } from "@/lib/kernel/setup-state";

/** Non-destructive — see Settings' "Re-run Setup Wizard". Marks setup incomplete
 *  again so proxy.ts redirects into /setup, without touching any existing data. */
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await reopenSetup();
  return Response.json({ ok: true });
}
