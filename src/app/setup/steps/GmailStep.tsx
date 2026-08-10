"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { StepFooter } from "../StepFooter";

const ACCENT = getModuleAccent("gmail");

export function GmailStep({
  redirectUri,
  initialConfigured,
  initialConnected,
  initialError,
  onContinue,
  onSkip,
  onBack,
}: {
  redirectUri: string;
  initialConfigured: boolean;
  initialConnected: boolean;
  initialError: string | null;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [configured, setConfigured] = useState(initialConfigured);
  const [connected] = useState(initialConnected);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [saving, setSaving] = useState(false);

  async function handleSaveCredentials(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in-up flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Mail className="h-4.5 w-4.5 text-[var(--accent)]" />
          Gmail
        </h2>
        <p className="text-sm text-muted-foreground">
          Connects via Google OAuth for the AI Assistant to read/send email. Optional — skip and configure this anytime from
          Settings.
        </p>
      </div>

      {connected ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-3 py-2.5 text-sm font-medium text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Connected
        </div>
      ) : (
        <>
          {!configured && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]">
              <p className="text-xs text-muted-foreground">
                Create an OAuth client at{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline decoration-border underline-offset-4"
                >
                  console.cloud.google.com
                </a>{" "}
                (type &quot;Web application&quot;) with this exact redirect URI:
              </p>
              <code className="block rounded-lg border border-border bg-foreground/[0.04] px-2.5 py-2 font-mono text-xs break-all dark:bg-white/[0.05]">
                {redirectUri}
              </code>
              <form onSubmit={handleSaveCredentials} className="flex flex-col gap-2">
                <Label htmlFor="setup-gmail-client-id" className="sr-only">
                  Client ID
                </Label>
                <Input
                  id="setup-gmail-client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID"
                  autoComplete="off"
                  className="h-9"
                />
                <Label htmlFor="setup-gmail-client-secret" className="sr-only">
                  Client Secret
                </Label>
                <Input
                  id="setup-gmail-client-secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Client Secret"
                  className="h-9"
                />
                <Button type="submit" disabled={saving || !clientId || !clientSecret} className="h-9 self-start px-4">
                  {saving ? "Saving…" : "Save credentials"}
                </Button>
              </form>
            </div>
          )}

          {configured && (
            <a
              href={`/api/modules/gmail/oauth/start?returnTo=setup`}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-10 w-fit gap-1.5 px-4")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Connect Google Account
            </a>
          )}

          {error && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </>
      )}

      <StepFooter onBack={onBack} onSkip={connected ? undefined : onSkip} primaryLabel="Continue" onPrimary={onContinue} />
    </div>
  );
}
