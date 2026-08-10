"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ExternalLink, FolderGit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModuleAccent } from "@/lib/icon-map";
import { StepFooter } from "../StepFooter";

const ACCENT = getModuleAccent("github");

export function GithubStep({ onContinue, onSkip, onBack }: { onContinue: () => void; onSkip: () => void; onBack: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError("A personal access token is required, or skip this step for now.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/modules/github/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not connect.");
        return;
      }
      onContinue();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in-up flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <FolderGit2 className="h-4.5 w-4.5 text-[var(--accent)]" />
          GitHub
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect a personal access token to browse repos, commits, pull requests, and issues. Optional — skip and configure
          this anytime from Settings.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="setup-github-token">Personal access token</Label>
        <Input
          id="setup-github-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="ghp_… personal access token"
          className="h-9 font-mono"
        />
        <a
          href="https://github.com/settings/tokens?type=beta"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
        >
          Create one at github.com/settings/tokens
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>

        {error && (
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <StepFooter onBack={onBack} onSkip={onSkip} primaryLabel="Connect & Continue" onPrimary={handleSubmit} primaryLoading={saving} />
    </form>
  );
}
