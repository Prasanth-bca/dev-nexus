"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, FolderGit2, Lock, LockOpen, Search, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getModuleAccent } from "@/lib/icon-map";
import { RepoList } from "./RepoList";
import { RepoDetail } from "./RepoDetail";
import type { RepoSummary } from "./types";

const ACCENT = getModuleAccent("github");

const FILTERS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "All", icon: FolderGit2 },
  { value: "public", label: "Public", icon: LockOpen },
  { value: "private", label: "Private", icon: Lock },
  { value: "owner", label: "Owned", icon: User },
  { value: "collaborator", label: "Collaborating", icon: ShieldCheck },
  { value: "organization", label: "Organization", icon: Building2 },
];

export function RepoExplorer() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  // Lazily seeded from ?repo=<owner>%2F<name> (Global Search / Command Palette deep link), same
  // pattern as Gmail's InboxView — first render is already correct, the effect below only fetches.
  const [selected, setSelected] = useState<string | null>(() => {
    const repo = searchParams.get("repo");
    return repo ? decodeURIComponent(repo) : null;
  });

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setLoadingList(true);
        const params = new URLSearchParams({ filter });
        if (query.trim()) params.set("q", query.trim());
        fetch(`/api/modules/github/repos?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => setRepos(Array.isArray(data) ? data : []))
          .finally(() => setLoadingList(false));
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
  }, [query, filter]);

  // The list already has full repo objects in memory — no separate detail fetch needed
  // for the badges/description shown in the header, only for branches/commits/PRs/issues.
  const selectedRepo = repos?.find((r) => r.fullName === selected) ?? null;

  return (
    <div className="animate-fade-in flex flex-1 min-h-0 gap-3 overflow-hidden">
      {/* Repository list — the floating glass panel of this screen. */}
      <div
        style={{ "--accent": ACCENT } as React.CSSProperties}
        className={`${selected ? "hidden md:flex" : "flex"} glass w-full shrink-0 flex-col overflow-hidden rounded-xl md:w-80`}
      >
        <div className="flex flex-col gap-2 border-b border-[var(--glass-border)] p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories…"
              aria-label="Search repositories"
              className="h-9 rounded-lg pl-8 text-sm"
            />
          </div>

          <div role="group" aria-label="Filter repositories" className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const isActive = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-200",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]"
                      : "border-border text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  <f.icon className="h-3 w-3" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <RepoList repos={repos} loading={loadingList} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {/* Detail pane — code, commits and tables live here, so it stays solid and unblurred. */}
      <div
        className={`${selected ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card`}
      >
        <RepoDetail fullName={selected} repo={selectedRepo} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
