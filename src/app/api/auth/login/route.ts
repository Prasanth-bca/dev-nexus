import { cookies } from "next/headers";
import { verifyCredentials } from "@/lib/kernel/auth-password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/kernel/auth-session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const userId = email && password ? await verifyCredentials(email, password) : null;
  if (!userId) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });

  return Response.json({ ok: true });
}
