"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CircleDot,
  CircleCheck,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { PermissionBadge, RelationshipBadge, VisibilityBadge } from "./RepoBadges";
import type { Branch, Commit, Issue, PullRequest, RepoSummary } from "./types";

const ACCENT = getModuleAccent("github");

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

/** open = success tint, merged = the module's own purple, closed = neutral. */
const STATE_TONE = {
  open: "border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
  merged:
    "border-[color-mix(in_srgb,var(--module-github)_35%,transparent)] bg-[color-mix(in_srgb,var(--module-github)_14%,transparent)] text-[var(--module-github)]",
  closed: "border-border bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06]",
} as const;

const ICON_TONE = {
  open: "text-[var(--success)]",
  merged: "text-[var(--module-github)]",
  closed: "text-muted-foreground",
} as const;

function StatePill({ tone, children }: { tone: keyof typeof STATE_TONE; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        STATE_TONE[tone]
      )}
    >
      {children}
    </span>
  );
}

/** Shared row chrome for the link lists (commits / PRs / issues). */
const ROW =
  "group flex items-center justify-between gap-3 rounded-lg border border-transparent px-2.5 py-2 text-sm transition-[background-color,border-color,transform] duration-200 hover:translate-x-0.5 hover:border-border hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]";

export function RepoDetail({
  fullName,
  repo,
  onClose,
}: {
  fullName: string | null;
  /** The full repo object from the list, when it's loaded — powers the visibility/relationship/permission badges. Absent transiently while the list is still loading, even if `fullName` is already set (e.g. a deep link). */
  repo: RepoSummary | null;
  onClose: () => void;
}) {
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
      <div className="flex h-full w-full items-center justify-center">
        <EmptyState
          icon={FolderGit2}
          accent={ACCENT}
          title="Select a repository"
          description="Choose a repository from the list to see its branches, commits, pull requests, and issues."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-1 min-h-0 flex-col" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex flex-col gap-2.5 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to repository list"
              className="h-11 w-11 shrink-0 md:hidden"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <FolderGit2 className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
            </span>
            <span className="truncate text-sm font-medium">{fullName}</span>
          </div>
          <a
            href={`https://github.com/${fullName}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${fullName} on GitHub`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.04] hover:text-foreground md:h-8 md:w-8 dark:hover:bg-white/[0.05]"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Why this repo is visible at all, and what you can do with it — the direct
            on-screen answer, not something you have to infer or go check GitHub for. */}
        {repo && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 pl-9">
              <VisibilityBadge isPrivate={repo.private} />
              <RelationshipBadge relationship={repo.relationship} ownerLogin={repo.ownerLogin} />
              <PermissionBadge permission={repo.permission} />
            </div>
            {repo.description && <p className="pl-9 text-xs text-muted-foreground">{repo.description}</p>}
          </>
        )}
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
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="commits">
                {data.commits.length === 0 ? (
                  <EmptyState icon={GitCommitHorizontal} accent={ACCENT} title="No commits" />
                ) : (
                  <ol className="stagger flex flex-col">
                    {data.commits.map((c, i) => (
                      <li key={c.sha} style={{ "--i": i } as React.CSSProperties}>
                        <a
                          href={c.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex gap-3 rounded-lg border border-transparent py-1.5 pr-2.5 transition-[background-color,border-color] duration-200 hover:border-border hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
                        >
                          {/* Commit timeline rail: stub above, dot, then the connector down to the next entry. */}
                          <span aria-hidden className="flex w-5 shrink-0 flex-col items-center self-stretch">
                            <span className={cn("w-px bg-border", i === 0 ? "h-2.5 opacity-0" : "h-2.5")} />
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_75%,transparent)] transition-transform duration-200 group-hover:scale-125" />
                            <span
                              className={cn("w-px flex-1 bg-border", i === data.commits.length - 1 && "opacity-0")}
                            />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
                            <span className="truncate text-sm">{c.message}</span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              <code className="rounded bg-foreground/[0.05] px-1 py-px font-mono text-[10px] dark:bg-white/[0.06]">
                                {c.sha.slice(0, 7)}
                              </code>
                              <span className="truncate">
                                {c.author} · {formatDate(c.date)}
                              </span>
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>

              <TabsContent value="branches">
                {data.branches.length === 0 ? (
                  <EmptyState icon={GitBranch} accent={ACCENT} title="No branches" />
                ) : (
                  <div className="stagger flex flex-col gap-0.5">
                    {data.branches.map((b, i) => (
                      <div
                        key={b.name}
                        style={{ "--i": i } as React.CSSProperties}
                        className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                          <span className="truncate font-mono text-[13px]">{b.name}</span>
                        </span>
                        {b.protected && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-white/[0.06]">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            Protected
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pulls">
                {data.pullRequests.length === 0 ? (
                  <EmptyState icon={GitPullRequest} accent={ACCENT} title="No pull requests" />
                ) : (
                  <div className="stagger flex flex-col gap-0.5">
                    {data.pullRequests.map((p, i) => {
                      const tone = p.merged ? "merged" : p.state === "open" ? "open" : "closed";
                      const StateIcon = p.merged ? GitMerge : p.state === "open" ? GitPullRequest : GitPullRequestClosed;
                      return (
                        <a
                          key={p.number}
                          href={p.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ "--i": i } as React.CSSProperties}
                          className={ROW}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <StateIcon className={cn("h-3.5 w-3.5 shrink-0", ICON_TONE[tone])} aria-hidden />
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{p.number}</span>
                            <span className="truncate">{p.title}</span>
                          </span>
                          <StatePill tone={tone}>{p.merged ? "merged" : p.state}</StatePill>
                        </a>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="issues">
                {data.issues.length === 0 ? (
                  <EmptyState icon={CircleDot} accent={ACCENT} title="No issues" />
                ) : (
                  <div className="stagger flex flex-col gap-0.5">
                    {data.issues.map((issue, i) => {
                      const tone = issue.state === "open" ? "open" : "closed";
                      const StateIcon = issue.state === "open" ? CircleDot : CircleCheck;
                      return (
                        <a
                          key={issue.number}
                          href={issue.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ "--i": i } as React.CSSProperties}
                          className={ROW}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <StateIcon className={cn("h-3.5 w-3.5 shrink-0", ICON_TONE[tone])} aria-hidden />
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{issue.number}</span>
                            <span className="truncate">{issue.title}</span>
                          </span>
                          <StatePill tone={tone}>{issue.state}</StatePill>
                        </a>
                      );
                    })}
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
