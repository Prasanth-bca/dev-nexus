"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, KeyRound, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getModuleAccent } from "@/lib/icon-map";

const ACCENT = getModuleAccent("github");

export function GithubSettingsView({ initialConnected }: { initialConnected: boolean }) {
  const [connected, setConnected] = useState(initialConnected);
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialConnected) return;
    fetch("/api/modules/github/status")
      .then((res) => res.json())
      .then((data) => setUsername(data.username ?? null));
  }, [initialConnected]);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
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
      setConnected(true);
      setUsername(data.username);
      setToken("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect GitHub? You'll need to reconnect to browse repos again.")) return;
    await fetch("/api/modules/github/disconnect", { method: "POST" });
    setConnected(false);
    setUsername(null);
  }

  return (
    <div className="animate-fade-in-up flex max-w-lg flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <p className="text-sm text-muted-foreground">
        Connects with a personal access token — create one at{" "}
        <a
          href="https://github.com/settings/tokens?type=beta"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-[var(--accent)]"
        >
          github.com/settings/tokens
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>{" "}
        with read access to repository contents, metadata, pull requests, and issues.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <KeyRound className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
            </span>
            <span className="text-sm font-medium">Personal access token</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm">
                <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--success)]" />
                <span className="font-medium">Connected{username ? ` as ${username}` : ""}</span>
              </span>
              <Button type="button" variant="destructive" size="sm" onClick={handleDisconnect} className="gap-1.5">
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="flex flex-col gap-2.5">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="ghp_… personal access token"
                aria-label="GitHub personal access token"
                className="h-9 font-mono"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={submitting || !token} className="h-10 self-start px-4">
                {submitting ? "Connecting…" : "Connect"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
