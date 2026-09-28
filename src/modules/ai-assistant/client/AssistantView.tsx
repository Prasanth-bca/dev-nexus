"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquare, Plug, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";
import type { ProviderDTO } from "../db/collections";
import { ChatView } from "./ChatView";

// Chat is the default/most-visited tab, so it stays a static import — deferring it would add
// a loading flicker to the common path. Providers/Tools are secondary settings screens,
// visited less often, so a performance audit's suggestion to lazy-load them (rather than
// shipping their code in the initial AI Assistant bundle regardless of which tab is opened)
// applies to these two instead.
const TAB_LOADING = <Skeleton className="h-40 w-full rounded-xl" />;
const ProvidersView = dynamic(() => import("./ProvidersView").then((m) => m.ProvidersView), { loading: () => TAB_LOADING });
const ToolSettingsView = dynamic(() => import("./ToolSettingsView").then((m) => m.ToolSettingsView), { loading: () => TAB_LOADING });

export function AssistantView({ initialProviders }: { initialProviders: ProviderDTO[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [tab, setTab] = useState<"chat" | "providers" | "tools">(initialProviders.some((p) => p.active) ? "chat" : "providers");

  async function refreshProviders() {
    const res = await fetch("/api/modules/ai-assistant/providers");
    setProviders(await res.json());
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "chat" | "providers" | "tools")}
        className="flex flex-1 min-h-0 flex-col"
      >
        <TabsList className="mb-2 h-9 shrink-0 self-start">
          <TabsTrigger value="chat" className="px-3">
            <MessageSquare />
            Chat
          </TabsTrigger>
          <TabsTrigger value="providers" className="px-3">
            <Plug />
            Providers
          </TabsTrigger>
          <TabsTrigger value="tools" className="px-3">
            <Wrench />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex flex-1 min-h-0 flex-col">
          <ChatView hasActiveProvider={providers.some((p) => p.active)} onNeedProviders={() => setTab("providers")} />
        </TabsContent>

        <TabsContent value="providers" className="animate-fade-in min-h-0 overflow-y-auto">
          <ProvidersView providers={providers} onChange={refreshProviders} />
        </TabsContent>

        <TabsContent value="tools" className="animate-fade-in min-h-0 overflow-y-auto">
          <ToolSettingsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
