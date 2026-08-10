"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepFooter } from "../StepFooter";

interface CheckResult {
  ok: boolean;
  mongoConnected: boolean;
  keysProvisioned: boolean;
  error?: string;
}

function CheckRow({ icon: Icon, label, state }: { icon: typeof Database; label: string; state: "pending" | "ok" | "fail" }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5 dark:bg-white/[0.02]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {state === "pending" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      {state === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />}
      {state === "fail" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
    </div>
  );
}

export function SystemCheckStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(true);

  function runCheck() {
    const timeout = setTimeout(() => {
      setChecking(true);
      setResult(null);
      fetch("/api/setup/system-check")
        .then((res) => res.json())
        .then((data: CheckResult) => setResult(data))
        .catch(() => setResult({ ok: false, mongoConnected: false, keysProvisioned: false, error: "Could not reach the server." }))
        .finally(() => setChecking(false));
    }, 0);
    return () => clearTimeout(timeout);
  }

  useEffect(() => runCheck(), []);

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">System Check</h2>
        <p className="text-sm text-muted-foreground">
          Confirming your database connection and encryption keys — generated automatically, nothing for you to configure.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <CheckRow icon={Database} label="MongoDB connection" state={checking ? "pending" : result?.mongoConnected ? "ok" : "fail"} />
        <CheckRow
          icon={KeyRound}
          label="Encryption & session keys"
          state={checking ? "pending" : result?.keysProvisioned ? "ok" : "fail"}
        />
      </div>

      {!checking && result && !result.ok && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {result.error || "Something isn't reachable yet."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={runCheck} className="w-fit gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <StepFooter onBack={onBack} primaryLabel="Continue" onPrimary={onContinue} primaryDisabled={checking || !result?.ok} />
    </div>
  );
}
