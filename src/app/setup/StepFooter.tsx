"use client";

import { ChevronLeft, ChevronRight, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepFooter({
  onBack,
  onSkip,
  skipLabel = "Skip for now",
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
}: {
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} className="gap-1.5 text-muted-foreground">
            <SkipForward className="h-3.5 w-3.5" />
            {skipLabel}
          </Button>
        )}
        <Button type="button" onClick={onPrimary} disabled={primaryDisabled || primaryLoading} className="gap-1.5 px-4">
          {primaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {primaryLabel}
          {!primaryLoading && <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
