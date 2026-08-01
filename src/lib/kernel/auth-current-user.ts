import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./auth-session";

/** Route-handler-only helper (uses next/headers) — reads and verifies the session cookie. */
export async function getCurrentUserId(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE_NAME)?.value);
}
