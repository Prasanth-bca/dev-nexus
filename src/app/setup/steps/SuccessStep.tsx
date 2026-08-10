"use client";

import { PartyPopper, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuccessStep({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center gap-5 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)]">
        <PartyPopper className="h-7 w-7 text-[var(--success)]" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">You&apos;re all set</h1>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          Dev Nexus is ready to go. You can revisit this setup anytime from Settings → Re-run Setup Wizard.
        </p>
      </div>
      <Button type="button" onClick={onGoToDashboard} size="lg" className="h-11 gap-1.5 px-6">
        <Rocket className="h-4 w-4" />
        Go to Dashboard
      </Button>
    </div>
  );
}
