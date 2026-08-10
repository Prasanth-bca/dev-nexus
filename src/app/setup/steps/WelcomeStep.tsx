"use client";

import { FolderGit2, KeyRound, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS = [
  { icon: Sparkles, label: "AI Assistant", accent: "var(--module-ai)" },
  { icon: Mail, label: "Gmail", accent: "var(--module-gmail)" },
  { icon: FolderGit2, label: "GitHub", accent: "var(--module-github)" },
  { icon: KeyRound, label: "Secret Manager", accent: "var(--module-secrets)" },
];

export function WelcomeStep({ email, onContinue }: { email: string; onContinue: () => void }) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center gap-6 py-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-2xl font-bold text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
        N
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to Dev Nexus, {email.split("@")[0]}</h1>
        <p className="max-w-md text-sm text-balance text-muted-foreground">
          Your admin account is ready. This quick setup connects the integrations you want — everything here is optional and
          you can always configure it later from Settings.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.label}
            style={{ "--accent": h.accent } as React.CSSProperties}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <h.icon className="h-4 w-4 text-[var(--accent)]" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{h.label}</span>
          </div>
        ))}
      </div>

      <Button type="button" onClick={onContinue} size="lg" className="h-11 gap-1.5 px-6">
        Get Started
      </Button>
    </div>
  );
}
