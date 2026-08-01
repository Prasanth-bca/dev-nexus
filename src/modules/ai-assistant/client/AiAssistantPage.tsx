import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVIDERS_COLLECTION, type ProviderDoc, type ProviderDTO } from "../db/collections";
import { AssistantView } from "./AssistantView";

/** Shape-matched placeholder — header, tab strip, then the rail + transcript split. */
function AssistantSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-9 w-56 rounded-lg" />
      <div className="flex min-h-0 flex-1 gap-4">
        <Skeleton className="h-full w-48 rounded-xl sm:w-56 lg:w-64" />
        <Skeleton className="h-full flex-1 rounded-xl" />
      </div>
    </div>
  );
}

export async function AiAssistantPage({ ctx }: { ctx: ModuleContext }) {
  const docs = await ctx.db.collection<ProviderDoc>(PROVIDERS_COLLECTION).find().sort({ provider: 1 }).toArray();

  const providers: ProviderDTO[] = docs.map((d) => ({
    provider: d.provider,
    model: d.model,
    baseUrl: d.baseUrl,
    active: d.active,
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <Suspense fallback={<AssistantSkeleton />}>
      <AssistantView initialProviders={providers} />
    </Suspense>
  );
}
