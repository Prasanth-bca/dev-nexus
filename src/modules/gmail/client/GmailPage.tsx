import { Suspense } from "react";
import { headers } from "next/headers";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { GmailView } from "./GmailView";

export async function GmailPage({ ctx }: { ctx: ModuleContext }) {
  let configured = false;
  let connected = false;

  try {
    await ctx.secrets.get("GMAIL_CLIENT_ID");
    await ctx.secrets.get("GMAIL_CLIENT_SECRET");
    configured = true;
  } catch {
    // not configured yet
  }

  try {
    await ctx.secrets.get("GMAIL_REFRESH_TOKEN");
    connected = true;
  } catch {
    // not connected yet
  }

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const redirectUri = `${proto}://${host}/api/modules/gmail/oauth/callback`;

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <GmailView initialConfigured={configured} initialConnected={connected} redirectUri={redirectUri} />
    </Suspense>
  );
}
