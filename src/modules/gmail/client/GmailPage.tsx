import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { GmailView } from "./GmailView";

export async function GmailPage({ ctx }: { ctx: ModuleContext }) {
  let connected = false;
  let email = "";

  try {
    email = await ctx.secrets.get("GMAIL_EMAIL");
    await ctx.secrets.get("GMAIL_APP_PASSWORD");
    connected = true;
  } catch {
    // not connected yet
  }

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <GmailView initialConnected={connected} initialEmail={email} />
    </Suspense>
  );
}
