"use client";

import { useState, type FormEvent } from "react";

interface SecretMeta {
  name: string;
  updatedAt: string;
}

export function SecretsManager({ initialSecrets }: { initialSecrets: SecretMeta[] }) {
  const [secrets, setSecrets] = useState<SecretMeta[]>(initialSecrets);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/secrets");
    setSecrets(await res.json());
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim().toUpperCase(), value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save secret.");
        return;
      }
      setName("");
      setValue("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReveal(secretName: string) {
    if (revealed[secretName] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[secretName];
        return next;
      });
      return;
    }
    setRevealing(secretName);
    try {
      const res = await fetch(`/api/secrets/${encodeURIComponent(secretName)}`);
      const data = await res.json();
      if (res.ok) setRevealed((prev) => ({ ...prev, [secretName]: data.value }));
    } finally {
      setRevealing(null);
    }
  }

  async function handleDelete(secretName: string) {
    if (!confirm(`Delete secret "${secretName}"? Any module relying on it will stop working until it's re-added.`)) return;
    await fetch(`/api/secrets/${encodeURIComponent(secretName)}`, { method: "DELETE" });
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[secretName];
      return next;
    });
    await refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold mb-1">Secret Manager</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Encrypted at rest (AES-256-GCM). Modules reference these by name — e.g. AI Assistant needs a provider key like{" "}
        <code className="text-xs">AI_PROVIDER_GROQ</code>, Gmail needs <code className="text-xs">GMAIL_CLIENT_ID</code>.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap items-start gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="NAME (e.g. GMAIL_CLIENT_ID)"
          required
          autoComplete="off"
          className="flex-1 min-w-[180px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          type="password"
          required
          autoComplete="new-password"
          className="flex-1 min-w-[180px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Add / Update"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {secrets.length === 0 ? (
        <p className="text-sm text-zinc-400">No secrets stored yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {secrets.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-mono text-sm truncate">{s.name}</div>
                <div className="text-[11px] text-zinc-400">
                  {revealed[s.name] !== undefined ? (
                    <span className="font-mono">{revealed[s.name]}</span>
                  ) : (
                    `Updated ${new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReveal(s.name)}
                  disabled={revealing === s.name}
                  className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  {revealing === s.name ? "…" : revealed[s.name] !== undefined ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.name)}
                  className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
