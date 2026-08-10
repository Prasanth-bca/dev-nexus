"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, FolderGit2, Mail, Sparkles, type LucideIcon } from "lucide-react";
import { getModuleAccent } from "@/lib/icon-map";
import { StepFooter } from "../StepFooter";

interface ReviewItem {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  connected: boolean;
}

export function ReviewStep({ onBack, onFinish, finishing }: { onBack: () => void; onFinish: () => void; finishing: boolean }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      Promise.all([
        fetch("/api/modules/ai-assistant/providers").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/modules/gmail/status").then((r) => (r.ok ? r.json() : { connected: false })),
        fetch("/api/modules/github/status").then((r) => (r.ok ? r.json() : { connected: false })),
      ]).then(([providers, gmail, github]) => {
        setItems([
          {
            key: "ai",
            label: "AI Assistant",
            icon: Sparkles,
            accent: getModuleAccent("ai-assistant"),
            connected: Array.isArray(providers) && providers.length > 0,
          },
          { key: "gmail", label: "Gmail", icon: Mail, accent: getModuleAccent("gmail"), connected: Boolean(gmail.connected) },
          {
            key: "github",
            label: "GitHub",
            icon: FolderGit2,
            accent: getModuleAccent("github"),
            connected: Boolean(github.connected),
          },
        ]);
      });
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Review & Finish</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s connected. Anything skipped can be set up later from Settings.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-foreground/[0.04] dark:bg-white/[0.05]" />
            ))
          : items.map((item) => (
              <div
                key={item.key}
                style={{ "--accent": item.accent } as React.CSSProperties}
                className="flex items-center gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5 dark:bg-white/[0.02]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  <item.icon className="h-4 w-4 text-[var(--accent)]" />
                </span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.connected ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[var(--success)]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Circle className="h-3.5 w-3.5" />
                    Not set up
                  </span>
                )}
              </div>
            ))}
      </div>

      <StepFooter
        onBack={onBack}
        primaryLabel="Finish Setup"
        onPrimary={onFinish}
        primaryLoading={finishing}
        primaryDisabled={items === null}
      />
    </div>
  );
}
