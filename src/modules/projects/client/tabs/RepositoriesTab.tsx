"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, FolderGit2, PlugZap, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { ProjectDTO } from "../../db/collections";
import type { RepoSummary } from "../../../github/client/types";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface GithubStatus {
  connected: boolean;
  username?: string;
}

export function RepositoriesTab({ project, onProjectUpdated }: Props) {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/modules/github/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false }));
  }, [project._id]);

  useEffect(() => {
    if (!dialogOpen) return;
    const timeout = setTimeout(
      () => {
        setLoadingRepos(true);
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        fetch(`/api/modules/github/repos?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => setRepos(Array.isArray(data) ? data : []))
          .finally(() => setLoadingRepos(false));
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
  }, [dialogOpen, query]);

  async function persist(nextRepos: string[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/modules/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: nextRepos }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not update repositories.");
        return;
      }
      onProjectUpdated(data);
      toast.success("Repositories updated.");
    } catch {
      toast.error("Could not update repositories.");
    } finally {
      setSaving(false);
    }
  }

  function unlink(fullName: string) {
    void persist(project.repos.filter((r) => r !== fullName));
  }

  function toggle(fullName: string) {
    const isLinked = project.repos.includes(fullName);
    void persist(isLinked ? project.repos.filter((r) => r !== fullName) : [...project.repos, fullName]);
  }

  if (status === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!status.connected) {
    return (
      <EmptyState
        icon={PlugZap}
        accent={ACCENT}
        title="GitHub isn't connected yet"
        description="Connect a personal access token under GitHub settings, then come back here to link repositories to this project."
        action={
          <Link href="/dashboard/github" className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}>
            <PlugZap className="h-4 w-4" />
            Connect GitHub
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {project.repos.length > 0
            ? `${project.repos.length} repositor${project.repos.length === 1 ? "y" : "ies"} linked`
            : "No repositories linked"}
        </p>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Link Repository
        </Button>
      </div>

      {project.repos.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          accent={ACCENT}
          title="No repositories linked"
          description="Link a GitHub repository so it's one click away from this project."
          action={
            <Button type="button" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Link Repository
            </Button>
          }
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {project.repos.map((fullName, i) => (
            <div key={fullName} style={{ "--i": i } as React.CSSProperties} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                <FolderGit2 className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{fullName}</span>
              <a
                href={`https://github.com/${fullName}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${fullName} on GitHub`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => unlink(fullName)}>
                Unlink
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link a repository</DialogTitle>
            <DialogDescription>Search your connected GitHub account and toggle repositories to link them to this project.</DialogDescription>
          </DialogHeader>

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

          <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {loadingRepos ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
            ) : !repos || repos.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No repositories found.</p>
            ) : (
              repos.map((r) => {
                const linked = project.repos.includes(r.fullName);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.fullName)}
                    disabled={saving}
                    aria-pressed={linked}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-200",
                      linked
                        ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                        : "hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        linked ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-border"
                      )}
                    >
                      {linked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{r.fullName}</span>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
