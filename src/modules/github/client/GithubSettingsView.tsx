"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold mb-1">GitHub</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Connects with a personal access token — create one at{" "}
        <a
          href="https://github.com/settings/tokens?type=beta"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          github.com/settings/tokens
        </a>{" "}
        with read access to repository contents, metadata, pull requests, and issues.
      </p>

      <div className="rounded-md border p-4">
        {connected ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected{username ? ` as ${username}` : ""}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="flex flex-col gap-2">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="ghp_… personal access token"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || !token} className="self-start">
              {submitting ? "Connecting…" : "Connect"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
