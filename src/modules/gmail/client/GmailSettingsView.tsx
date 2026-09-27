"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, KeyRound, Mail, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";

const ACCENT = getModuleAccent("gmail");

const GOOGLE_LOGO = (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function ConnectedState({ email, onDisconnect }: { email: string; onDisconnect: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden className="h-2 w-2 rounded-full bg-green-500" />
            Connected
          </span>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={onDisconnect} className="gap-1.5">
          <Unplug className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      </CardContent>
    </Card>
  );
}

function GmailSettings({ initialConnected, initialEmail }: { initialConnected: boolean; initialEmail: string }) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(() => initialConnected || searchParams.get("status") === "connected");
  const [email, setEmail] = useState(initialEmail);
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const status = searchParams.get("status");
    const msg = searchParams.get("message");
    return status === "error" && msg ? msg : null;
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/modules/gmail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, appPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not connect to Gmail.");
        return;
      }
      setConnected(true);
      setAppPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? You'll need to reconnect to use inbox features.")) return;
    await fetch("/api/modules/gmail/disconnect", { method: "POST" });
    setConnected(false);
    setEmail("");
  }

  if (connected) {
    return (
      <div className="flex max-w-lg flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <ConnectedState email={email} onDisconnect={handleDisconnect} />
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-5" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div>
        <h2 className="text-base font-semibold">Connect Gmail Account</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Use an App Password for secure access — no OAuth, no Google Cloud setup.
        </p>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <KeyRound className="h-4 w-4 text-[var(--accent)]" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Generate an App Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Takes 2 minutes. This is a Google security feature.</p>
            </div>
          </div>

          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-[var(--accent)] mt-0.5">1.</span>
              Go to{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2 hover:text-[var(--accent)]"
              >
                Google App Passwords <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-[var(--accent)] mt-0.5">2.</span>
              Enter "Dev Nexus" as the app name and click <strong className="text-foreground font-medium">Create</strong>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-[var(--accent)] mt-0.5">3.</span>
              Copy the 16-character password Google shows (remove spaces if pasting)
            </li>
          </ol>

          <form onSubmit={handleConnect} className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                aria-label="Gmail address"
                autoComplete="email"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <Input
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value.replace(/\s/g, ""))}
                type="password"
                autoComplete="new-password"
                placeholder="16-character App Password"
                aria-label="App Password"
                className="h-9 font-mono text-xs"
                required
                maxLength={16}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !email.trim() || appPassword.length !== 16}
              className="h-10 gap-2 self-end px-5 mt-1"
            >
              {GOOGLE_LOGO}
              {submitting ? "Connecting…" : "Connect Gmail"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">Note:</strong> 2-Step Verification must be enabled on your Google Account to generate App
        Passwords.{" "}
        <a
          href="https://support.google.com/accounts/answer/185833"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline underline-offset-2"
        >
          Learn more
        </a>
      </p>
    </div>
  );
}

export function GmailSettingsView(props: { initialConnected: boolean; initialEmail: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex max-w-lg flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <GmailSettings initialConnected={props.initialConnected} initialEmail={props.initialEmail} />
    </Suspense>
  );
}
