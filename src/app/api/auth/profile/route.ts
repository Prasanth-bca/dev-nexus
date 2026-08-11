import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { updateUserProfile } from "@/lib/kernel/auth-password";

const MAX_BIO_LENGTH = 500;

/** Updates the admin's basic profile info (name, job title, phone, bio) — deliberately no
 *  current-password check, unlike /api/auth/change-credentials, since none of this is
 *  security-sensitive. */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const patch: Record<string, string> = {};
  for (const key of ["displayName", "jobTitle", "phone", "bio"] as const) {
    if (typeof body[key] === "string") patch[key] = body[key];
  }

  if (typeof patch.bio === "string" && patch.bio.length > MAX_BIO_LENGTH) {
    return Response.json({ error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const profile = await updateUserProfile(userId, patch);
  return Response.json({ profile });
}
