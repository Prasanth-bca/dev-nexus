"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { getModuleAccent } from "@/lib/icon-map";
import type { ProjectDTO } from "../db/collections";
import { PRIORITY_META, STATUS_META } from "./statusMeta";

const ACCENT = getModuleAccent("projects");

export function ProjectCard({
  project,
  onOpen,
  onEdit,
  onRequestDelete,
}: {
  project: ProjectDTO;
  onOpen: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const status = STATUS_META[project.status];
  const priority = PRIORITY_META[project.priority];
  const StatusIcon = status.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex h-[188px] cursor-pointer flex-col gap-2 rounded-xl p-3.5 text-left",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      <span
        aria-hidden
        className="absolute top-3 bottom-3 left-0 w-[3px] scale-y-0 rounded-r-full bg-[var(--accent)] transition-transform duration-200 group-hover:scale-y-100"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
            style={{
              borderColor: `color-mix(in srgb, ${status.tone} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${status.tone} 12%, transparent)`,
            }}
          >
            <StatusIcon className="h-3.5 w-3.5" style={{ color: status.tone }} />
          </span>
          <span className="truncate text-sm font-medium">{project.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit project"
            title="Edit project"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete project"
            title="Delete project"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {project.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{project.description}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">No description yet.</p>
      )}

      {project.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {project.techStack.slice(0, 4).map((tech) => (
            <span key={tech} className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
              {tech}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="truncate rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: `color-mix(in srgb, ${status.tone} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${status.tone} 12%, transparent)`,
              color: status.tone,
            }}
          >
            {project.status}
          </span>
          <span
            className="truncate rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: `color-mix(in srgb, ${priority.tone} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${priority.tone} 12%, transparent)`,
              color: priority.tone,
            }}
          >
            {priority.label}
          </span>
        </div>
        {/* suppressHydrationWarning: legitimately time-dependent text — see NoteCard.tsx. */}
        <span className="shrink-0 text-[10px] text-muted-foreground" suppressHydrationWarning>
          {formatRelativeTime(project.updatedAt)}
        </span>
      </div>
    </div>
  );
}
