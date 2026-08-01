"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Plug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { PROVIDER_LABELS, PROVIDER_DEFAULT_MODELS, type ProviderDTO, type ProviderType } from "../db/collections";

const ACCENT = getModuleAccent("ai-assistant");

const PROVIDER_OPTIONS: ProviderType[] = ["anthropic", "openai", "groq", "custom"];

const PROVIDER_ITEMS = PROVIDER_OPTIONS.map((p) => ({ label: PROVIDER_LABELS[p], value: p }));

export function ProvidersView({ providers, onChange }: { providers: ProviderDTO[]; onChange: () => void }) {
  const [provider, setProvider] = useState<ProviderType>("anthropic");
  const [model, setModel] = useState(PROVIDER_DEFAULT_MODELS.anthropic);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
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
      setApiKey("");
      onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function activate(p: ProviderType) {
    await fetch(`/api/modules/ai-assistant/providers/${p}/activate`, { method: "POST" });
    onChange();
  }

  async function remove(p: ProviderType) {
    if (!confirm(`Remove ${PROVIDER_LABELS[p]} configuration?`)) return;
    await fetch(`/api/modules/ai-assistant/providers/${p}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div style={{ "--accent": ACCENT } as React.CSSProperties} className="flex max-w-xl flex-col gap-6 pb-2">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Add a provider</CardTitle>
            <CardDescription>
              Configure one or more LLM providers. Only one is active (used for Chat) at a time. Keys are stored encrypted via
              Secret Manager.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-provider">Provider</Label>
              <Select
                items={PROVIDER_ITEMS}
                value={provider}
                onValueChange={(value) => {
                  const next = value as ProviderType | null;
                  if (!next) return;
                  setProvider(next);
                  setModel(PROVIDER_DEFAULT_MODELS[next]);
                }}
              >
                <SelectTrigger id="ai-provider" className="h-9 w-full">
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
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model (e.g. claude-sonnet-4-5)"
                className="h-9"
              />
            </div>

            {provider === "custom" && (
              <div className="animate-fade-in flex flex-col gap-1.5">
                <Label htmlFor="ai-base-url">Base URL</Label>
                <Input
                  id="ai-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Base URL (e.g. http://localhost:11434/v1)"
                  className="h-9"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-api-key">API key</Label>
              <Input
                id="ai-api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="API key"
                className="h-9"
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={submitting} className="h-11 px-4 md:h-9">
              {submitting ? "Saving…" : "Save provider"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {providers.length === 0 ? (
        <EmptyState
          accent={ACCENT}
          icon={Plug}
          title="No providers configured yet"
          description="Save an API key above and it will show up here, ready to activate."
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {providers.map((p, i) => (
            <div
              key={p.provider}
              style={{ "--i": i } as React.CSSProperties}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate font-medium">{PROVIDER_LABELS[p.provider]}</span>
                  {p.active && (
                    <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                      Active
                    </span>
                  )}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{p.model}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!p.active && (
                  <Button type="button" variant="outline" size="sm" onClick={() => activate(p.provider)} className="h-9 md:h-7">
                    Activate
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(p.provider)}
                  aria-label={`Remove ${PROVIDER_LABELS[p.provider]}`}
                  className="h-9 md:h-7"
                >
                  <Trash2 />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
