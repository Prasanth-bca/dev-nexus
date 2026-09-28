"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModuleAccent } from "@/lib/icon-map";
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
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(initialConnected);

  async function handleSaveCredentials(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/modules/gmail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          appPassword: appPassword.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not connect to Gmail. Check your credentials.");
        return;
      }
      setConnected(true);
      setEmail("");
      setAppPassword("");
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
          Connect your Gmail via IMAP/SMTP using an App Password. Optional — skip and configure this anytime from Settings.
        </p>
      </div>

      {connected ? (
        <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-3 py-2.5 text-sm font-medium text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Connected to {email || "Gmail"}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                You need a <strong>Google App Password</strong> (not your regular Gmail password).{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4 hover:decoration-[var(--accent)]"
                >
                  Generate one here
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <form onSubmit={handleSaveCredentials} className="flex flex-col gap-2.5 mt-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-gmail-email" className="text-xs font-medium">
                  Gmail Address
                </Label>
                <Input
                  id="setup-gmail-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  autoComplete="email"
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-gmail-password" className="text-xs font-medium">
                  App Password
                </Label>
                <Input
                  id="setup-gmail-password"
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="16-character app password"
                  autoComplete="new-password"
                  className="h-9 font-mono"
                />
              </div>

              <Button type="submit" disabled={saving || !email || !appPassword} className="h-9 self-start px-4 mt-1">
                {saving ? "Connecting…" : "Save credentials"}
              </Button>
            </form>
          </div>

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
