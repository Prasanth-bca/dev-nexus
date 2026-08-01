"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { InboxView } from "./InboxView";
import { GmailSettingsView } from "./GmailSettingsView";

export function GmailView({
  initialConfigured,
  initialConnected,
  redirectUri,
}: {
  initialConfigured: boolean;
  initialConnected: boolean;
  redirectUri: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Gmail" description="Read and manage your inbox without leaving Dev Nexus." />

      <Tabs defaultValue={initialConnected ? "inbox" : "settings"} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="flex flex-1 min-h-0 flex-col">
          {initialConnected ? (
            <InboxView />
          ) : (
            <p className="text-sm text-muted-foreground">Connect your Google account under Settings to see your inbox here.</p>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <GmailSettingsView initialConfigured={initialConfigured} initialConnected={initialConnected} redirectUri={redirectUri} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
