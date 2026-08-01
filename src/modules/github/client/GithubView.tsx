"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { RepoExplorer } from "./RepoExplorer";
import { GithubSettingsView } from "./GithubSettingsView";

export function GithubView({ initialConnected }: { initialConnected: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="GitHub" description="Browse repositories, branches, commits, pull requests, and issues." />

      <Tabs defaultValue={initialConnected ? "repos" : "settings"} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="repos">Repositories</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="repos" className="flex flex-1 min-h-0 flex-col">
          {initialConnected ? (
            <RepoExplorer />
          ) : (
            <p className="text-sm text-muted-foreground">Connect a personal access token under Settings to browse your repos here.</p>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <GithubSettingsView initialConnected={initialConnected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
