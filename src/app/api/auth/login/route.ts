import { cookies } from "next/headers";
import { verifyCredentials } from "@/lib/kernel/auth-password";
import { createSessionToken, isSecureRequest, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/kernel/auth-session";
import { checkLoginRateLimit, clearLoginAttempts, recordFailedLogin } from "@/lib/kernel/login-rate-limit";

export async function POST(req: Request) {
  // No x-forwarded-for in a typical direct local connection — those all share one bucket,
  // which is fine for this app's threat model (rate-limiting login attempts in general is
  // the goal, not attributing them to a specific client with certainty).
  const clientKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "direct";
  const rateLimit = checkLoginRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const userId = email && password ? await verifyCredentials(email, password) : null;
  if (!userId) {
    recordFailedLogin(clientKey);
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }
  clearLoginAttempts(clientKey);

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
