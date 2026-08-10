"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepRail, type WizardStep } from "./StepRail";
import { WelcomeStep } from "./steps/WelcomeStep";
import { SystemCheckStep } from "./steps/SystemCheckStep";
import { AiStep } from "./steps/AiStep";
import { GmailStep } from "./steps/GmailStep";
import { GithubStep } from "./steps/GithubStep";
import { ReviewStep } from "./steps/ReviewStep";
import { SuccessStep } from "./steps/SuccessStep";

const STEPS: WizardStep[] = [
  { id: "welcome", label: "Welcome", required: true },
  { id: "system", label: "System Check", required: true },
  { id: "ai", label: "AI Assistant", required: false },
  { id: "gmail", label: "Gmail", required: false },
  { id: "github", label: "GitHub", required: false },
  { id: "review", label: "Review", required: true },
];

export function SetupWizard({
  email,
  gmailConfigured,
  gmailConnected,
  gmailRedirectUri,
}: {
  email: string;
  gmailConfigured: boolean;
  gmailConnected: boolean;
  gmailRedirectUri: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resuming after Gmail's OAuth round-trip is a full page reload (the browser left the app
  // entirely for Google and came back), so the wizard's step needs to come back from the
  // ?step= the OAuth callback set, not from in-memory state — lazy-init off searchParams
  // rather than an effect, since it's already correct on this very first render.
  const [stepIndex, setStepIndex] = useState(() => {
    const idx = STEPS.findIndex((s) => s.id === searchParams.get("step"));
    return idx >= 0 ? idx : 0;
  });
  // Cosmetic only (drives the StepRail's "skipped" dot) — doesn't survive the OAuth
  // round-trip's full page reload, and doesn't need to: ReviewStep independently verifies
  // what's actually connected via live status fetches, not from this set.
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [gmailInitialConnected] = useState(() => gmailConnected || searchParams.get("status") === "connected");
  const [gmailInitialError] = useState<string | null>(() => {
    const message = searchParams.get("message");
    return searchParams.get("status") === "error" && message ? message : null;
  });

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function skipCurrent() {
    setSkipped((prev) => new Set(prev).add(STEPS[stepIndex].id));
    goNext();
  }

  async function finish() {
    setFinishing(true);
    try {
      await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: Array.from(skipped) }),
      });
      setFinished(true);
    } finally {
      setFinishing(false);
    }
  }

  if (finished) {
    return (
      <div className="glass animate-fade-in-up rounded-xl p-6 sm:p-8">
        <SuccessStep
          onGoToDashboard={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        />
      </div>
    );
  }

  const step = STEPS[stepIndex];

  return (
    <div className="glass animate-fade-in-up rounded-xl p-6 sm:p-8">
      <StepRail steps={STEPS} activeIndex={stepIndex} skipped={skipped} />

      {step.id === "welcome" && <WelcomeStep email={email} onContinue={goNext} />}
      {step.id === "system" && <SystemCheckStep onContinue={goNext} onBack={goBack} />}
      {step.id === "ai" && <AiStep onContinue={goNext} onSkip={skipCurrent} onBack={goBack} />}
      {step.id === "gmail" && (
        <GmailStep
          redirectUri={gmailRedirectUri}
          initialConfigured={gmailConfigured}
          initialConnected={gmailInitialConnected}
          initialError={gmailInitialError}
          onContinue={goNext}
          onSkip={skipCurrent}
          onBack={goBack}
        />
      )}
      {step.id === "github" && <GithubStep onContinue={goNext} onSkip={skipCurrent} onBack={goBack} />}
      {step.id === "review" && <ReviewStep onBack={goBack} onFinish={finish} finishing={finishing} />}
    </div>
  );
}
