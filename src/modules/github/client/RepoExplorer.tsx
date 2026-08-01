"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RepoList } from "./RepoList";
import { RepoDetail } from "./RepoDetail";
import type { RepoSummary } from "./types";

export function RepoExplorer() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
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
        fetch(`/api/modules/github/repos${query ? `?q=${encodeURIComponent(query)}` : ""}`)
          .then((res) => res.json())
          .then((data) => setRepos(Array.isArray(data) ? data : []))
          .finally(() => setLoadingList(false));
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="animate-fade-in flex flex-1 min-h-0 gap-3 overflow-hidden">
      {/* Repository list — the floating glass panel of this screen. */}
      <div className={`${selected ? "hidden md:flex" : "flex"} glass w-full shrink-0 flex-col overflow-hidden rounded-xl md:w-80`}>
        <div className="border-b border-[var(--glass-border)] p-2.5">
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
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <RepoList repos={repos} loading={loadingList} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {/* Detail pane — code, commits and tables live here, so it stays solid and unblurred. */}
      <div
        className={`${selected ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card`}
      >
        <RepoDetail fullName={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
