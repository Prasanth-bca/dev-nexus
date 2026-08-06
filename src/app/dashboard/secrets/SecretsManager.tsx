"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectSelect, useProjects } from "@/components/project-select";
import { getModuleAccent } from "@/lib/icon-map";

interface SecretMeta {
  name: string;
  updatedAt: string;
  projectId?: string;
}

const ACCENT = getModuleAccent("secrets");

export function SecretsManager({ initialSecrets }: { initialSecrets: SecretMeta[] }) {
  const [secrets, setSecrets] = useState<SecretMeta[]>(initialSecrets);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const projects = useProjects();

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

  async function handleProjectChange(secretName: string, projectId: string) {
    await fetch(`/api/secrets/${encodeURIComponent(secretName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    setSecrets((prev) => prev.map((s) => (s.name === secretName ? { ...s, projectId: projectId || undefined } : s)));
  }

  async function handleDelete(secretName: string) {
    await fetch(`/api/secrets/${encodeURIComponent(secretName)}`, { method: "DELETE" });
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[secretName];
      return next;
    });
    await refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <PageHeader
        title="Secret Manager"
        description="Encrypted at rest with AES-256-GCM."
        icon={KeyRound}
        accent={ACCENT}
        className="mb-0"
      />

      <Card>
        <CardHeader>
          <CardTitle>Add or update a secret</CardTitle>
          <CardDescription>
            Modules reference these by name — e.g. AI Assistant needs a provider key like{" "}
            <code className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.08]">AI_PROVIDER_GROQ</code>, Gmail
            needs <code className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.08]">GMAIL_CLIENT_ID</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="secret-name">Name</Label>
              <Input
                id="secret-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="GMAIL_CLIENT_ID"
                required
                autoComplete="off"
                className="h-10 font-mono"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="secret-value">Value</Label>
              <Input
                id="secret-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="••••••••••••"
                type="password"
                required
                autoComplete="new-password"
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={submitting} className="h-10 shrink-0 px-4">
              <Plus aria-hidden className="h-4 w-4" />
              {submitting ? "Saving…" : "Add / Update"}
            </Button>
          </form>

          {error && (
            <p
              role="alert"
              className="animate-fade-in mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {secrets.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No secrets stored yet"
          description="Add your first secret above — it's encrypted before it ever touches disk."
          accent={ACCENT}
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {secrets.map((s, i) => {
            const isRevealed = revealed[s.name] !== undefined;
            return (
              <div
                key={s.name}
                style={{ "--i": i } as React.CSSProperties}
                className="glass lift flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  <KeyRound aria-hidden className="h-4 w-4 text-[var(--accent)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-medium">{s.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {isRevealed ? (
                      <span className="font-mono text-foreground">{revealed[s.name]}</span>
                    ) : (
                      <span aria-hidden className="font-mono tracking-[0.2em]">
                        ••••••••••••
                      </span>
                    )}
                  </div>
                </div>

                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {`Updated ${new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                </span>

                <ProjectSelect
                  value={s.projectId ?? ""}
                  onChange={(projectId) => handleProjectChange(s.name, projectId)}
                  projects={projects}
                  ariaLabel={`Assign ${s.name} to project`}
                  className="hidden h-8 shrink-0 rounded-lg border border-input bg-foreground/[0.03] px-2 text-xs outline-none sm:block dark:bg-white/[0.04]"
                />

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReveal(s.name)}
                    disabled={revealing === s.name}
                    aria-label={isRevealed ? `Hide value of ${s.name}` : `Reveal value of ${s.name}`}
                    aria-pressed={isRevealed}
                    className="h-11 w-11 sm:h-8 sm:w-8"
                  >
                    {isRevealed ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(s.name)}
                    aria-label={`Delete secret ${s.name}`}
                    className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete ? `Delete secret "${pendingDelete}"?` : "Delete secret?"}
        description="Any module relying on it will stop working until it's re-added."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
      />
    </div>
  );
}
