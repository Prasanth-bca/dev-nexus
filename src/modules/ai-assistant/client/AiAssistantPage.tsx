import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PROVIDERS_COLLECTION, type ProviderDoc, type ProviderDTO } from "../db/collections";
import { AssistantView } from "./AssistantView";

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
    <Suspense fallback={null}>
      <AssistantView initialProviders={providers} />
    </Suspense>
  );
}
