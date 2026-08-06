"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FolderGit2,
  History,
  KeyRound,
  Link2,
  Server,
  StickyNote,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";
import { formatRelativeTime } from "@/lib/format";
import type { ProjectDTO } from "../../db/collections";
import type { ActivityDTO } from "../../../activity/db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface OverviewCounts {
  repos: number;
  notes: number;
  files: number;
  secrets: number;
  meetings: number;
  links: number;
  contacts: number;
  environments: number;
}

interface OverviewData {
  counts: OverviewCounts;
  recentActivity: ActivityDTO[];
}

const STAT_TILES: { key: keyof OverviewCounts; label: string; icon: LucideIcon }[] = [
  { key: "repos", label: "Repos", icon: FolderGit2 },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "files", label: "Files", icon: Vault },
  { key: "secrets", label: "Secrets", icon: KeyRound },
  { key: "meetings", label: "Meetings", icon: CalendarDays },
  { key: "links", label: "Links", icon: Link2 },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "environments", label: "Environments", icon: Server },
];

export function OverviewTab({ project }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Deferred out of the effect body so the setState-then-fetch kickoff doesn't run
    // synchronously within the effect — same pattern used across the app's other
    // list-loading effects (Activity, Gmail, GitHub, Command Palette).
    const timeout = setTimeout(() => {
      setLoading(true);
      setData(null);
      fetch(`/api/modules/projects/${project._id}/overview`)
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled) setData(json);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [project._id]);

  return (
    <div className="flex flex-col gap-6" style={{ "--accent": ACCENT } as React.CSSProperties}>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_TILES.map(({ key, label, icon: Icon }) => (
            <div key={key} className="glass flex flex-col gap-2 rounded-xl p-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-semibold tabular-nums">{data?.counts?.[key] ?? 0}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <h3 className="mb-2 text-sm font-medium">Description</h3>
        {project.description ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{project.description}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No description yet.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 text-sm font-medium">Tags</h3>
          {project.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
                  #{tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tags.</p>
          )}
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 text-sm font-medium">Tech Stack</h3>
          {project.techStack.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {project.techStack.map((tech) => (
                <span key={tech} className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
                  {tech}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No technologies listed.</p>
          )}
        </div>
      </div>

      {(project.startDate || project.targetDate) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.startDate && (
            <div className="glass rounded-xl p-4">
              <h3 className="mb-1 text-sm font-medium">Start Date</h3>
              <p className="text-sm text-muted-foreground">{new Date(project.startDate).toLocaleDateString()}</p>
            </div>
          )}
          {project.targetDate && (
            <div className="glass rounded-xl p-4">
              <h3 className="mb-1 text-sm font-medium">Target Date</h3>
              <p className="text-sm text-muted-foreground">{new Date(project.targetDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          Recent Activity
        </h3>
        {!data || data.recentActivity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.recentActivity.map((event) => {
              const row = (
                <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]">
                  <span className="min-w-0 flex-1 truncate">{event.summary}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(event.timestamp)}</span>
                </div>
              );
              return event.href ? (
                <Link key={event.id} href={event.href} className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                  {row}
                </Link>
              ) : (
                <div key={event.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
