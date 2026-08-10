import { hasAnyUser } from "@/lib/kernel/auth-password";
import { getSetupState } from "@/lib/kernel/setup-state";

export async function GET() {
  const [hasUser, setup] = await Promise.all([hasAnyUser(), getSetupState()]);
  return Response.json({ hasUser, setupComplete: setup.completed });
}
