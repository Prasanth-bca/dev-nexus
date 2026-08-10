"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  required: boolean;
}

export function StepRail({
  steps,
  activeIndex,
  skipped,
}: {
  steps: WizardStep[];
  activeIndex: number;
  skipped: Set<string>;
}) {
  return (
    <ol className="mb-6 flex items-center gap-1.5" aria-label="Setup progress">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const isSkipped = skipped.has(step.id);
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1.5">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors duration-200",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? isSkipped
                        ? "border-border bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06]"
                        : "border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]"
                      : "border-border bg-transparent text-muted-foreground"
                )}
              >
                {done && !isSkipped ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-[11px] sm:block",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
                {!step.required && <span className="text-muted-foreground/70"> · optional</span>}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn("h-px flex-1", done ? "bg-[color-mix(in_srgb,var(--success)_35%,transparent)]" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
