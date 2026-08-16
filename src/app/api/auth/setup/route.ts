import { cookies } from "next/headers";
import { createAdminUser } from "@/lib/kernel/auth-password";
import { createSessionToken, isSecureRequest, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/kernel/auth-session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let userId: string;
  try {
    userId = await createAdminUser(email, password);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Setup failed." }, { status: 400 });
  }

  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}
