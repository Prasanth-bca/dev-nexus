import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { GithubView } from "./GithubView";

export async function GithubPage({ ctx }: { ctx: ModuleContext }) {
  let connected = false;
  try {
    await ctx.secrets.get("GITHUB_TOKEN");
    connected = true;
  } catch {
    // not connected yet
  }

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <GithubView initialConnected={connected} />
    </Suspense>
  );
}
