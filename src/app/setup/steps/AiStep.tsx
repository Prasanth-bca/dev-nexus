"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModuleAccent } from "@/lib/icon-map";
import { PROVIDER_LABELS, PROVIDER_DEFAULT_MODELS, type ProviderType } from "@/modules/ai-assistant/db/collections";
import { StepFooter } from "../StepFooter";

const ACCENT = getModuleAccent("ai-assistant");
const PROVIDER_OPTIONS: ProviderType[] = ["anthropic", "openai", "groq", "custom"];

export function AiStep({ onContinue, onSkip, onBack }: { onContinue: () => void; onSkip: () => void; onBack: () => void }) {
  const [provider, setProvider] = useState<ProviderType>("anthropic");
  const [model, setModel] = useState(PROVIDER_DEFAULT_MODELS.anthropic);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!apiKey.trim()) {
      setError("An API key is required, or skip this step for now.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/modules/ai-assistant/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey, baseUrl: baseUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save provider.");
        return;
      }
      onContinue();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in-up flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-4.5 w-4.5 text-[var(--accent)]" />
          AI Assistant
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect an LLM provider to enable the AI Assistant. Optional — skip and configure this anytime from Settings.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-ai-provider">Provider</Label>
          <Select
            value={provider}
            onValueChange={(value) => {
              const next = value as ProviderType | null;
              if (!next) return;
              setProvider(next);
              setModel(PROVIDER_DEFAULT_MODELS[next]);
            }}
          >
            <SelectTrigger id="setup-ai-provider" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-ai-model">Model</Label>
          <Input id="setup-ai-model" value={model} onChange={(e) => setModel(e.target.value)} className="h-9" />
        </div>

        {provider === "custom" && (
          <div className="animate-fade-in flex flex-col gap-1.5">
            <Label htmlFor="setup-ai-base-url">Base URL</Label>
            <Input
              id="setup-ai-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="h-9"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-ai-key">API key</Label>
          <Input
            id="setup-ai-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="API key"
            className="h-9"
          />
        </div>

        {error && (
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <StepFooter onBack={onBack} onSkip={onSkip} primaryLabel="Save & Continue" onPrimary={handleSubmit} primaryLoading={saving} />
    </form>
  );
}
