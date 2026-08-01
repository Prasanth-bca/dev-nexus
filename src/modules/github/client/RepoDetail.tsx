"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CircleDot, ExternalLink, FolderGit2, GitBranch, GitCommitHorizontal, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Branch, Commit, Issue, PullRequest } from "./types";

interface DetailData {
  branches: Branch[];
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
}

function formatDate(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RepoDetail({ fullName, onClose }: { fullName: string | null; onClose: () => void }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fullName) return;
    // setTimeout(…, 0) defers the setState-then-fetch kickoff out of the effect body itself —
    // same pattern used by the Command Palette's search effect and Gmail's InboxView list loader.
    const timeout = setTimeout(() => {
      setLoading(true);
      setData(null);
      Promise.all(
        ["branches", "commits", "pulls", "issues"].map((resource) =>
          fetch(`/api/modules/github/repos/${fullName}/${resource}`).then((res) => (res.ok ? res.json() : []))
        )
      )
        .then(([branches, commits, pullRequests, issues]) => setData({ branches, commits, pullRequests, issues }))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, [fullName]);

  if (!fullName) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="Select a repository"
        description="Choose a repository from the list to see its branches, commits, pull requests, and issues."
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-medium">{fullName}</span>
        </div>
        <a
          href={`https://github.com/${fullName}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <Tabs defaultValue="commits" className="flex flex-1 min-h-0 flex-col p-3">
        <TabsList className="mb-3 self-start">
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="pulls">Pull Requests</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading || !data ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="commits">
                {data.commits.length === 0 ? (
                  <EmptyState icon={GitCommitHorizontal} title="No commits" />
                ) : (
                  <div className="flex flex-col gap-1">
                    {data.commits.map((c) => (
                      <a
                        key={c.sha}
                        href={c.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-accent/50"
                      >
                        <span className="truncate">{c.message}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.author} · {formatDate(c.date)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="branches">
                {data.branches.length === 0 ? (
                  <EmptyState icon={GitBranch} title="No branches" />
                ) : (
                  <div className="flex flex-col gap-1">
                    {data.branches.map((b) => (
                      <div key={b.name} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                        <span className="flex items-center gap-1.5 truncate">
                          <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {b.name}
                        </span>
                        {b.protected && <Badge variant="outline">Protected</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pulls">
                {data.pullRequests.length === 0 ? (
                  <EmptyState icon={GitPullRequest} title="No pull requests" />
                ) : (
                  <div className="flex flex-col gap-1">
                    {data.pullRequests.map((p) => (
                      <a
                        key={p.number}
                        href={p.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-accent/50"
                      >
                        <span className="truncate">
                          #{p.number} {p.title}
                        </span>
                        <Badge variant={p.merged ? "secondary" : p.state === "open" ? "default" : "outline"}>
                          {p.merged ? "merged" : p.state}
                        </Badge>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="issues">
                {data.issues.length === 0 ? (
                  <EmptyState icon={CircleDot} title="No issues" />
                ) : (
                  <div className="flex flex-col gap-1">
                    {data.issues.map((i) => (
                      <a
                        key={i.number}
                        href={i.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-accent/50"
                      >
                        <span className="truncate">
                          #{i.number} {i.title}
                        </span>
                        <Badge variant={i.state === "open" ? "default" : "outline"}>{i.state}</Badge>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
