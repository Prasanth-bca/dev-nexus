import { hasAnyUser } from "@/lib/kernel/auth-password";

export async function GET() {
  return Response.json({ hasUser: await hasAnyUser() });
}
