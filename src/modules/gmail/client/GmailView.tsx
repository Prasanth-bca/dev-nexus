"use client";

import { PlugZap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { InboxView } from "./InboxView";
import { GmailSettingsView } from "./GmailSettingsView";

const ACCENT = getModuleAccent("gmail");

export function GmailView({
  initialConnected,
  initialEmail,
}: {
  initialConnected: boolean;
  initialEmail: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue={initialConnected ? "inbox" : "settings"} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-2 self-start">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="flex flex-1 min-h-0 flex-col">
          {initialConnected ? (
            <InboxView />
          ) : (
            <EmptyState
              icon={PlugZap}
              accent={ACCENT}
              className="my-auto"
              title="Gmail isn't connected yet"
              description="Connect your Google account under Settings to see your inbox here."
            />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <GmailSettingsView initialConnected={initialConnected} initialEmail={initialEmail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
