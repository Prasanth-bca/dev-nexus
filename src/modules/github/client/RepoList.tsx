"use client";

import { FolderGit2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { RelationshipBadge, VisibilityBadge } from "./RepoBadges";
import type { RepoSummary } from "./types";

const ACCENT = getModuleAccent("github");

/**
 * Language → dot colour, mirroring GitHub's own linguist palette. Deliberately a
 * hand-kept map rather than a fetch: it is pure decoration, so an unknown language
 * degrades to a neutral dot instead of costing a request.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Dart: "#00b4ab",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Scala: "#c22d40",
  Perl: "#0298c3",
  R: "#198ce7",
  Zig: "#ec915c",
  Nix: "#7e7eff",
  Shell: "#89e051",
  PowerShell: "#012456",
  Dockerfile: "#384d54",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  MDX: "#fcb32c",
  Markdown: "#083fa1",
  "Jupyter Notebook": "#da5b0b",
  "Objective-C": "#438eff",
};

function languageColor(language: string) {
  return LANGUAGE_COLORS[language] ?? "var(--muted-foreground)";
}

function formatUpdated(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
      <div className="flex flex-col gap-1.5 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <EmptyState
        icon={FolderGit2}
        accent={ACCENT}
        title="No repositories found"
        description="Try a different search, or check your GitHub account."
      />
    );
  }

  return (
    <div className="stagger flex flex-col gap-0.5 p-2" style={{ "--accent": ACCENT } as React.CSSProperties}>
      {repos.map((r, i) => {
        const isSelected = selected === r.fullName;
        const [owner, ...rest] = r.fullName.split("/");
        const name = rest.join("/") || owner;
        const updated = formatUpdated(r.updatedAt);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.fullName)}
            aria-current={isSelected ? "true" : undefined}
            style={{ "--i": i } as React.CSSProperties}
            className={cn(
              "group relative flex min-h-11 w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left",
              "transition-[background-color,border-color,transform] duration-200 outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/40",
              isSelected
                ? "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                : "border-transparent hover:translate-x-0.5 hover:border-border hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-[var(--accent)] transition-opacity duration-200",
                isSelected ? "opacity-100" : "opacity-0"
              )}
            />

            <span className="truncate text-sm">
              <span className="text-muted-foreground">{rest.length > 0 ? `${owner}/` : ""}</span>
              <span className={cn("font-medium", isSelected && "text-[var(--accent)]")}>{name}</span>
            </span>

            <span className="flex flex-wrap items-center gap-1">
              <VisibilityBadge isPrivate={r.private} compact />
              <RelationshipBadge relationship={r.relationship} ownerLogin={r.ownerLogin} compact />
            </span>

            {r.description && <span className="line-clamp-2 text-xs text-muted-foreground">{r.description}</span>}

            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {r.language && (
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                    style={{ backgroundColor: languageColor(r.language) }}
                  />
                  {r.language}
                </span>
              )}
              <span className="flex items-center gap-1 tabular-nums">
                <Star className="h-3 w-3" aria-hidden />
                {r.stars}
                <span className="sr-only">stars</span>
              </span>
              {updated && <span className="tabular-nums">Updated {updated}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
