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
    <div className="flex flex-1 min-h-0 gap-0 overflow-hidden rounded-lg border">
      <div className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col border-r`}>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <RepoList repos={repos} loading={loadingList} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
        <RepoDetail fullName={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
