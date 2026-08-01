import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/kernel/auth-session";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
  return Response.json({ ok: true });
}
