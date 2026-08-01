"use client";

import { useState } from "react";
import type { ProviderDTO } from "../db/collections";
import { ChatView } from "./ChatView";
import { ProvidersView } from "./ProvidersView";
import { ToolSettingsView } from "./ToolSettingsView";

function tabClass(active: boolean) {
  return `text-xs px-3 py-1.5 rounded-md border ${
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
      : "border-zinc-200 dark:border-zinc-800"
  }`;
}

export function AssistantView({ initialProviders }: { initialProviders: ProviderDTO[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [tab, setTab] = useState<"chat" | "providers" | "tools">(initialProviders.some((p) => p.active) ? "chat" : "providers");

  async function refreshProviders() {
    const res = await fetch("/api/modules/ai-assistant/providers");
    setProviders(await res.json());
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab("chat")} className={tabClass(tab === "chat")}>
            Chat
          </button>
          <button type="button" onClick={() => setTab("providers")} className={tabClass(tab === "providers")}>
            Providers
          </button>
          <button type="button" onClick={() => setTab("tools")} className={tabClass(tab === "tools")}>
            Tools
          </button>
        </div>
      </div>

      {tab === "chat" ? (
        <ChatView hasActiveProvider={providers.some((p) => p.active)} onNeedProviders={() => setTab("providers")} />
      ) : tab === "providers" ? (
        <ProvidersView providers={providers} onChange={refreshProviders} />
      ) : (
        <ToolSettingsView />
      )}
    </div>
  );
}
