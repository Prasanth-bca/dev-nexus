import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById } from "@/lib/kernel/auth-password";
import { getSecret } from "@/lib/kernel/secrets";
import { SetupWizard } from "./SetupWizard";

// Force dynamic rendering — this page reads from MongoDB
export const dynamic = 'force-dynamic';

/**
 * proxy.ts already gates this route (redirects unauthenticated visitors to /login,
 * and redirects here from /dashboard until setup is complete). This server-side
 * check is defense-in-depth, matching the same pattern /dashboard/settings uses.
 */
export default async function SetupPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await getUserById(userId);
  if (!user) redirect("/login");

  // Same server-side computation GmailPage.tsx uses for its own settings screen —
  // duplicated rather than imported since this page has no ModuleContext to fetch through.
  let gmailConfigured = false;
  let gmailConnected = false;
  try {
    await getSecret("GMAIL_CLIENT_ID");
    await getSecret("GMAIL_CLIENT_SECRET");
    gmailConfigured = true;
  } catch {
    // not configured yet
  }
  try {
    await getSecret("GMAIL_REFRESH_TOKEN");
    gmailConnected = true;
  } catch {
    // not connected yet
  }

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const gmailRedirectUri = `${proto}://${host}/api/modules/gmail/oauth/callback`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
          <SetupWizard
            email={user.email}
            gmailConfigured={gmailConfigured}
            gmailConnected={gmailConnected}
            gmailRedirectUri={gmailRedirectUri}
          />
        </Suspense>
      </div>
    </div>
  );
}
