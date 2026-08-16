"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { ENVIRONMENT_STATUSES, type EnvironmentDTO, type EnvironmentStatus, type ProjectDTO } from "../../db/collections";

const ACCENT = getModuleAccent("projects");

const STATUS_COLORS: Record<EnvironmentStatus, string> = {
  Online: "#22c55e",
  Offline: "#ef4444",
  Maintenance: "#f97316",
  Unknown: "#71717a",
};

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface EnvironmentFormValues {
  name: string;
  status: EnvironmentStatus;
  url: string;
  server: string;
  database: string;
  notes: string;
}

function toFormValues(env: EnvironmentDTO | null): EnvironmentFormValues {
  return {
    name: env?.name ?? "",
    status: env?.status ?? "Unknown",
    url: env?.url ?? "",
    server: env?.server ?? "",
    database: env?.database ?? "",
    notes: env?.notes ?? "",
  };
}

function EnvironmentFormDialog({
  open,
  onOpenChange,
  environment,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: EnvironmentDTO | null;
  onSubmit: (values: EnvironmentFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<EnvironmentFormValues>(() => toFormValues(environment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setValues(toFormValues(environment));
      setError(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, environment]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{environment ? "Edit Environment" : "New Environment"}</DialogTitle>
            <DialogDescription>
              {environment ? "Update this environment's details." : "Track an environment for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="env-name">Name</Label>
                <Input
                  id="env-name"
                  value={values.name}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                  placeholder="e.g. Production"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v as EnvironmentStatus }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="env-url">URL</Label>
              <Input
                id="env-url"
                value={values.url}
                onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="env-server">Server</Label>
                <Input
                  id="env-server"
                  value={values.server}
                  onChange={(e) => setValues((v) => ({ ...v, server: e.target.value }))}
                  placeholder="e.g. ec2-3-12-45-1"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="env-database">Database</Label>
                <Input
                  id="env-database"
                  value={values.database}
                  onChange={(e) => setValues((v) => ({ ...v, database: e.target.value }))}
                  placeholder="e.g. prod-db-01"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="env-notes">Notes</Label>
              <Textarea
                id="env-notes"
                value={values.notes}
                onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
                placeholder="Anything worth remembering…"
                className="min-h-16"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : environment ? "Save Changes" : "Create Environment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnvironmentCard({
  environment,
  onEdit,
  onRequestDelete,
}: {
  environment: EnvironmentDTO;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const tone = STATUS_COLORS[environment.status];

  return (
    <div
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex flex-col gap-2 rounded-xl p-3.5 text-left",
        "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
            <Server className="h-3.5 w-3.5 text-[var(--accent)]" />
          </span>
          <span className="truncate text-sm font-medium">{environment.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit environment"
            title="Edit environment"
            onClick={onEdit}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete environment"
            title="Delete environment"
            onClick={onRequestDelete}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span
        className="w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: `color-mix(in srgb, ${tone} 25%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${tone} 12%, transparent)`,
          color: tone,
        }}
      >
        {environment.status}
      </span>

      {environment.url && (
        <a
          href={environment.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1 text-xs text-[var(--accent)] hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{environment.url}</span>
        </a>
      )}

      {(environment.server || environment.database) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground">
          {environment.server && <span>{environment.server}</span>}
          {environment.database && <span>{environment.database}</span>}
        </div>
      )}

      {environment.notes && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{environment.notes}</p>}
    </div>
  );
}

export function EnvironmentsTab({ project }: Props) {
  const [environments, setEnvironments] = useState<EnvironmentDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EnvironmentDTO | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/projects/${project._id}/environments`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setEnvironments(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) toast.error("Could not load environments.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [project._id]);

  function refresh() {
    fetch(`/api/modules/projects/${project._id}/environments`)
      .then((res) => res.json())
      .then((data) => setEnvironments(Array.isArray(data) ? data : []));
  }

  async function handleSubmit(values: EnvironmentFormValues) {
    const payload = {
      name: values.name.trim(),
      status: values.status,
      url: values.url.trim(),
      server: values.server.trim(),
      database: values.database.trim(),
      notes: values.notes.trim(),
    };
    const url = editing
      ? `/api/modules/projects/${project._id}/environments/${editing._id}`
      : `/api/modules/projects/${project._id}/environments`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    refresh();
    toast.success(editing ? "Environment updated." : "Environment created.");
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/projects/${project._id}/environments/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete environment.");
        return;
      }
      setEnvironments((prev) => prev?.filter((e) => e._id !== id) ?? prev);
      toast.success("Environment deleted.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Environment
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !environments || environments.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No environments yet"
          description="Track staging, production, and other environments for this project."
          accent={ACCENT}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Environment
            </Button>
          }
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {environments.map((e, i) => (
            <div key={e._id} style={{ "--i": i } as React.CSSProperties}>
              <EnvironmentCard
                environment={e}
                onEdit={() => {
                  setEditing(e);
                  setDialogOpen(true);
                }}
                onRequestDelete={() => setDeleteId(e._id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* key forces a clean remount when switching which environment is being edited (or to
          create-mode) — without it, the dialog briefly showed the previous environment's data
          in what should be a blank form, since its internal state only resyncs a tick later. */}
      <EnvironmentFormDialog
        key={editing?._id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        environment={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this environment?"
        description="This permanently removes the environment. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
