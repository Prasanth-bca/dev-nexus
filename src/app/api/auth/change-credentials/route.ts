import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { updateCredentials } from "@/lib/kernel/auth-password";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newEmail = typeof body.newEmail === "string" ? body.newEmail.trim().toLowerCase() : undefined;
  const newPassword = typeof body.newPassword === "string" && body.newPassword ? body.newPassword : undefined;

  if (!currentPassword) {
    return Response.json({ error: "Current password is required." }, { status: 400 });
  }
  if (newEmail && !newEmail.includes("@")) {
    return Response.json({ error: "New email is not valid." }, { status: 400 });
  }
  if (newPassword && newPassword.length < 8) {
    return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await updateCredentials(userId, { currentPassword, newEmail, newPassword });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }

  return Response.json({ ok: true });
}
