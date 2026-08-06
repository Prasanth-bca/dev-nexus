"use client";

import { useEffect, useState } from "react";

export interface ProjectOption {
  _id: string;
  name: string;
}

/** Fetches the project list once — shared by every module's "Assign Project" control. */
export function useProjects(): ProjectOption[] {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  useEffect(() => {
    fetch("/api/modules/projects")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setProjects(Array.isArray(data) ? data.map((p: { _id: string; name: string }) => ({ _id: p._id, name: p.name })) : [])
      )
      .catch(() => setProjects([]));
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
