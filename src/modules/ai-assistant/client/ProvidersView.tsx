"use client";

import { useState, type FormEvent } from "react";
import { PROVIDER_LABELS, PROVIDER_DEFAULT_MODELS, type ProviderDTO, type ProviderType } from "../db/collections";

const PROVIDER_OPTIONS: ProviderType[] = ["anthropic", "openai", "groq", "custom"];

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
    <div className="max-w-lg">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Configure one or more LLM providers. Only one is active (used for Chat) at a time. Keys are stored encrypted via Secret
        Manager.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6 border border-zinc-200 dark:border-zinc-800 rounded-md p-3">
        <select
          value={provider}
          onChange={(e) => {
            const next = e.target.value as ProviderType;
            setProvider(next);
            setModel(PROVIDER_DEFAULT_MODELS[next]);
          }}
          className="text-sm border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 bg-transparent"
        >
          {PROVIDER_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>

        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model (e.g. claude-sonnet-4-5)"
          className="text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 outline-none focus:border-zinc-400"
        />

        {provider === "custom" && (
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL (e.g. http://localhost:11434/v1)"
            className="text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 outline-none focus:border-zinc-400"
          />
        )}

        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="API key"
          className="text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 outline-none focus:border-zinc-400"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="text-sm rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium py-2 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save provider"}
        </button>
      </form>

      {providers.length === 0 ? (
        <p className="text-sm text-zinc-400">No providers configured yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="flex items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm flex items-center gap-2">
                  {p.active && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                  {PROVIDER_LABELS[p.provider]}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">{p.model}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!p.active && (
                  <button
                    type="button"
                    onClick={() => activate(p.provider)}
                    className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    Activate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.provider)}
                  className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
