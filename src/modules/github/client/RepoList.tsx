"use client";

import { FolderGit2, Lock, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { RepoSummary } from "./types";

export function RepoList({
  repos,
  loading,
  selected,
  onSelect,
}: {
  repos: RepoSummary[] | null;
  loading: boolean;
  selected: string | null;
  onSelect: (fullName: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-md border p-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <EmptyState icon={FolderGit2} title="No repositories found" description="Try a different search, or check your GitHub account." />
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {repos.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.fullName)}
          className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
            selected === r.fullName ? "border-primary bg-accent" : "border-transparent hover:border-border hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {r.private && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="truncate text-sm font-medium">{r.fullName}</span>
          </div>
          {r.description && <span className="truncate text-xs text-muted-foreground">{r.description}</span>}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {r.language && <span>{r.language}</span>}
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3" />
              {r.stars}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
