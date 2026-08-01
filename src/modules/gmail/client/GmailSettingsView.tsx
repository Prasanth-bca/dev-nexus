"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ACCENT = getModuleAccent("gmail");

/** Numbered step heading — the accent tile mirrors PageHeader's icon treatment. */
function StepTitle({ step, icon: Icon, children }: { step: number; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
        <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
      </span>
      <span className="text-sm font-medium">
        <span className="mr-1.5 text-muted-foreground tabular-nums">{step}.</span>
        {children}
      </span>
    </CardTitle>
  );
}

function GmailSettings({
  initialConfigured,
  initialConnected,
  redirectUri,
}: {
  initialConfigured: boolean;
  initialConnected: boolean;
  redirectUri: string;
}) {
  const searchParams = useSearchParams();
  const [configured, setConfigured] = useState(initialConfigured);
  // Lazily fold the OAuth redirect's ?status=connected/error into initial state instead of
  // syncing it via an effect — searchParams is already correct on first render (this route is
  // always dynamically rendered, never statically optimized, since it sits behind the auth gate).
  const [connected, setConnected] = useState(() => initialConnected || searchParams.get("status") === "connected");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    return status === "error" && message ? message : null;
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/modules/gmail/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save credentials.");
        return;
      }
      setConfigured(true);
      setClientId("");
      setClientSecret("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? You'll need to reconnect to use it again.")) return;
    await fetch("/api/modules/gmail/disconnect", { method: "POST" });
    setConnected(false);
  }

  return (
    <div className="animate-fade-in-up flex max-w-lg flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <p className="text-sm text-muted-foreground">
        Connects via Google OAuth so the AI Assistant can later list unread email and manage labels. This page only sets up the
        connection — nothing is read yet.
      </p>

      <Card>
        <CardHeader>
          <StepTitle step={1} icon={ShieldCheck}>
            Create OAuth credentials in Google Cloud Console
          </StepTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ol className="flex list-inside list-decimal flex-col gap-1 text-sm text-muted-foreground">
            <li>Create (or reuse) a project at console.cloud.google.com.</li>
            <li>Enable the &quot;Gmail API&quot; for that project.</li>
            <li>Configure the OAuth consent screen (&quot;External&quot; is fine for personal use).</li>
            <li>Create credentials → OAuth client ID → type &quot;Web application&quot; → add this exact Authorized redirect URI:</li>
          </ol>
          {/* Reading surface: solid, no blur — this string gets copied character by character. */}
          <code className="block rounded-lg border border-border bg-foreground/[0.04] px-2.5 py-2 font-mono text-xs break-all dark:bg-white/[0.05]">
            {redirectUri}
          </code>
          <p className="text-sm text-muted-foreground">Then copy the generated Client ID and Client Secret below.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <StepTitle step={2} icon={KeyRound}>
            Save your credentials
          </StepTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-2.5">
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID"
              aria-label="Client ID"
              autoComplete="off"
              className="h-9"
            />
            <Input
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Client Secret"
              aria-label="Client Secret"
              className="h-9"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting || !clientId || !clientSecret} className="h-10 self-start px-4">
              {submitting ? "Saving…" : "Save credentials"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <StepTitle step={3} icon={CheckCircle2}>
            Connect your Google account
          </StepTitle>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Connected
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/api/modules/gmail/oauth/start"
                  title="Re-run the consent flow — needed after new permissions (e.g. sending) are added"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconnect
                </Link>
                <Button type="button" variant="destructive" size="sm" onClick={handleDisconnect} className="gap-1.5">
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : configured ? (
            <Link
              href="/api/modules/gmail/oauth/start"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-10 gap-1.5 px-4")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Connect Google Account
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Save your Client ID and Secret above first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function GmailSettingsView(props: { initialConfigured: boolean; initialConnected: boolean; redirectUri: string }) {
  return (
    <Suspense fallback={<div className="flex max-w-lg flex-col gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}>
      <GmailSettings {...props} />
    </Suspense>
  );
}
