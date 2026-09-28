"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getModuleAccent } from "@/lib/icon-map";
import type { ProjectDTO } from "../db/collections";
import { PRIORITY_META, STATUS_META } from "./statusMeta";
import { OverviewTab } from "./tabs/OverviewTab";
import { CodeTab } from "./tabs/CodeTab";
import { DocsTab } from "./tabs/DocsTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { SettingsTab } from "./tabs/SettingsTab";

const ACCENT = getModuleAccent("projects");

/**
 * Shared prop contract for every tab under a project — read-only project data plus a way
 * to push an updated ProjectDTO back up (e.g. after linking a repo, or editing in Settings)
 * without each tab re-fetching the whole project itself.
 */
export interface ProjectTabProps {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

export function ProjectDetail({
  project,
  onBack,
  onEdit,
  onProjectUpdated,
  onProjectDeleted,
}: {
  project: ProjectDTO;
  onBack: () => void;
  onEdit: () => void;
  onProjectUpdated: (project: ProjectDTO) => void;
  onProjectDeleted: () => void;
}) {
  const status = STATUS_META[project.status];
  const priority = PRIORITY_META[project.priority];
  const StatusIcon = status.icon;

  return (
    <div className="animate-fade-in flex h-full min-h-0 flex-col" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="ghost" size="icon" aria-label="Back to projects" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: `color-mix(in srgb, ${status.tone} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${status.tone} 12%, transparent)`,
            }}
          >
            <StatusIcon className="h-5 w-5" style={{ color: status.tone }} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: `color-mix(in srgb, ${status.tone} 25%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${status.tone} 12%, transparent)`,
                  color: status.tone,
                }}
              >
                {project.status}
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: `color-mix(in srgb, ${priority.tone} 25%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${priority.tone} 12%, transparent)`,
                  color: priority.tone,
                }}
              >
                {priority.label} priority
              </span>
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="shrink-0 gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-2 self-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="overview">
            <OverviewTab project={project} onProjectUpdated={onProjectUpdated} />
          </TabsContent>
          <TabsContent value="code">
            <CodeTab project={project} onProjectUpdated={onProjectUpdated} />
          </TabsContent>
          <TabsContent value="docs">
            <DocsTab project={project} onProjectUpdated={onProjectUpdated} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab project={project} onProjectUpdated={onProjectUpdated} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab project={project} onProjectUpdated={onProjectUpdated} onProjectDeleted={onProjectDeleted} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
