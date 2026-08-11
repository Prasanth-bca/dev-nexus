"use client";

import { useEffect, useState } from "react";

export interface ProjectOption {
  _id: string;
  name: string;
}

const CACHE_TTL_MS = 60_000;

/**
 * Module-level cache shared by every mount of useProjects() across the whole app — Notes'
 * NoteDetail, File Vault's FilePreviewDialog, and SecretsManager each render their own
 * "Assign Project" control, and NoteDetail in particular remounts on every note switch and
 * every edit/preview toggle. Without this, each of those was firing its own independent
 * `/api/modules/projects` fetch, found live via a performance audit. A short TTL (rather than
 * caching forever) keeps a newly-created/renamed project from being invisible in already-open
 * dropdowns for more than a minute, without needing cross-module cache-invalidation plumbing.
 */
let cache: { projects: ProjectOption[]; fetchedAt: number } | null = null;
let inFlight: Promise<ProjectOption[]> | null = null;

function isFresh(): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

async function fetchProjects(): Promise<ProjectOption[]> {
  if (isFresh()) return cache!.projects;
  if (inFlight) return inFlight;

  inFlight = fetch("/api/modules/projects")
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      const projects: ProjectOption[] = Array.isArray(data)
        ? data.map((p: { _id: string; name: string }) => ({ _id: p._id, name: p.name }))
        : [];
      cache = { projects, fetchedAt: Date.now() };
      return projects;
    })
    .catch(() => [])
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Shared by every module's "Assign Project" control — see the module-level cache above. */
export function useProjects(): ProjectOption[] {
  const [projects, setProjects] = useState<ProjectOption[]>(() => (isFresh() ? cache!.projects : []));

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((result) => {
      if (!cancelled) setProjects(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return projects;
}

/** Native <select>, matching Notes' existing category-dropdown styling — used to assign a
 *  Note/File/Secret to a Projects-module project without any of those modules depending on
 *  the Projects module's client code. */
export function ProjectSelect({
  value,
  onChange,
  projects,
  className,
  ariaLabel = "Assign to project",
}: {
  value: string;
  onChange: (projectId: string) => void;
  projects: ProjectOption[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={
        className ??
        "rounded-lg border border-input bg-foreground/[0.03] px-2 py-1 text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/[0.04]"
      }
    >
      <option value="">No project</option>
      {projects.map((p) => (
        <option key={p._id} value={p._id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
