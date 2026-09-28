"use client";

import { PlugZap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { RepoExplorer } from "./RepoExplorer";
import { GithubSettingsView } from "./GithubSettingsView";

const ACCENT = getModuleAccent("github");

export function GithubView({ initialConnected }: { initialConnected: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue={initialConnected ? "repos" : "settings"} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-2 self-start">
          <TabsTrigger value="repos">Repositories</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="repos" className="flex flex-1 min-h-0 flex-col">
          {initialConnected ? (
            <RepoExplorer />
          ) : (
            <EmptyState
              icon={PlugZap}
              accent={ACCENT}
              className="my-auto"
              title="GitHub isn't connected yet"
              description="Connect a personal access token under Settings to browse your repos here."
            />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <GithubSettingsView initialConnected={initialConnected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
