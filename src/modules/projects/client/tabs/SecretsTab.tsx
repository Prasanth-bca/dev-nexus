"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import type { ProjectDTO } from "../../db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface SecretMeta {
  name: string;
  updatedAt: string;
  projectId?: string;
}

export function SecretsTab({ project }: Props) {
  const [secrets, setSecrets] = useState<SecretMeta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/secrets?projectId=${project._id}`);
    setSecrets(await res.json());
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/secrets?projectId=${project._id}`)
        .then((res) => res.json())
        .then((data) => setSecrets(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, [project._id]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const upperName = name.trim().toUpperCase();
    setSubmitting(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: upperName, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save secret.");
        return;
      }
      // Scope the freshly created secret to this project — two sequential requests,
      // mirroring the two-step create-then-assign contract of the /api/secrets surface.
      await fetch(`/api/secrets/${encodeURIComponent(upperName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project._id }),
      });
      setName("");
      setValue("");
      await refresh();
      toast.success("Secret saved.");
    } catch {
      toast.error("Could not save secret.");
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

  async function handleCopy(secretName: string) {
    try {
      let val = revealed[secretName];
      if (val === undefined) {
        const res = await fetch(`/api/secrets/${encodeURIComponent(secretName)}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error("Could not copy secret.");
          return;
        }
        val = data.value;
      }
      await navigator.clipboard.writeText(val);
      toast.success(`Copied ${secretName} to clipboard.`);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  async function handleDelete(secretName: string) {
    await fetch(`/api/secrets/${encodeURIComponent(secretName)}`, { method: "DELETE" });
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[secretName];
      return next;
    });
    await refresh();
    toast.success("Secret deleted.");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <form onSubmit={handleAdd} className="glass flex flex-col gap-3 rounded-xl p-3.5 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="project-secret-name">Name</Label>
          <Input
            id="project-secret-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="API_KEY"
            required
            autoComplete="off"
            className="h-9 font-mono"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="project-secret-value">Value</Label>
          <Input
            id="project-secret-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="••••••••••••"
            type="password"
            required
            autoComplete="new-password"
            className="h-9"
          />
        </div>
        <Button type="submit" disabled={submitting} className="h-9 shrink-0 gap-1.5 px-3.5">
          <Plus className="h-3.5 w-3.5" />
          {submitting ? "Saving…" : "Add"}
        </Button>
      </form>

      {!secrets || secrets.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          accent={ACCENT}
          title="No secrets scoped to this project"
          description="Add a secret above — it's encrypted before it ever touches disk."
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {secrets.map((s, i) => {
            const isRevealed = revealed[s.name] !== undefined;
            return (
              <div key={s.name} style={{ "--i": i } as React.CSSProperties} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  <KeyRound className="h-4 w-4 text-[var(--accent)]" />
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

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReveal(s.name)}
                    disabled={revealing === s.name}
                    aria-label={isRevealed ? `Hide value of ${s.name}` : `Reveal value of ${s.name}`}
                    aria-pressed={isRevealed}
                    className="h-8 w-8"
                  >
                    {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleCopy(s.name)}
                    aria-label={`Copy value of ${s.name}`}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(s.name)}
                    aria-label={`Delete secret ${s.name}`}
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
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
