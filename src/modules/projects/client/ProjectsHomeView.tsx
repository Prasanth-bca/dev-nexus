"use client";

import { useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { getModuleAccent } from "@/lib/icon-map";
import { PROJECT_STATUSES, type ProjectDTO } from "../db/collections";
import { ProjectCard } from "./ProjectCard";

const ACCENT = getModuleAccent("projects");

export function ProjectsHomeView({
  projects,
  onOpen,
  onCreate,
  onEdit,
  onRequestDelete,
}: {
  projects: ProjectDTO[];
  onOpen: (project: ProjectDTO) => void;
  onCreate: () => void;
  onEdit: (project: ProjectDTO) => void;
  onRequestDelete: (project: ProjectDTO) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return `${p.name} ${p.description} ${p.tags.join(" ")} ${p.techStack.join(" ")}`.toLowerCase().includes(q);
    });
  }, [projects, query, status]);

  return (
    <div className="animate-fade-in flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="h-9 rounded-lg pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <div role="group" aria-label="Filter by status" className="flex items-center gap-1 overflow-x-auto">
            {["all", ...PROJECT_STATUSES].map((s) => {
              const isActive = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={isActive}
                  style={{ "--accent": ACCENT } as React.CSSProperties}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-200",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]"
                      : "border-border text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  {s === "all" ? "All" : s}
                </button>
              );
            })}
          </div>
          <Button type="button" onClick={onCreate} size="sm" className="shrink-0 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
      </div>

      <div className="@container min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            accent={ACCENT}
            title={projects.length === 0 ? "No projects yet" : "No projects found"}
            description={
              projects.length === 0
                ? "Create your first project to start linking repos, notes, files, and more around it."
                : "Nothing matches the current filter. Try a different search or status."
            }
            action={
              projects.length === 0 ? (
                <Button type="button" onClick={onCreate} size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="stagger grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4">
            {filtered.map((project, i) => (
              <div key={project._id} style={{ "--i": i } as React.CSSProperties}>
                <ProjectCard
                  project={project}
                  onOpen={() => onOpen(project)}
                  onEdit={() => onEdit(project)}
                  onRequestDelete={() => onRequestDelete(project)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
