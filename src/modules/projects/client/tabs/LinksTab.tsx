"use client";

import { useEffect, useState } from "react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { ProjectDTO, QuickLinkDTO } from "../../db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface LinkFormValues {
  title: string;
  url: string;
  icon: string;
  category: string;
}

function toFormValues(link: QuickLinkDTO | null): LinkFormValues {
  return {
    title: link?.title ?? "",
    url: link?.url ?? "",
    icon: link?.icon ?? "",
    category: link?.category ?? "",
  };
}

function LinkFormDialog({
  open,
  onOpenChange,
  link,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: QuickLinkDTO | null;
  onSubmit: (values: LinkFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<LinkFormValues>(() => toFormValues(link));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setValues(toFormValues(link));
      setError(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, link]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!values.url.trim()) {
      setError("URL is required.");
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
            <DialogTitle>{link ? "Edit Link" : "New Link"}</DialogTitle>
            <DialogDescription>
              {link ? "Update this quick link." : "Add a quick link for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                value={values.title}
                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                placeholder="e.g. Staging dashboard"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={values.url}
                onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="link-category">Category</Label>
                <Input
                  id="link-category"
                  value={values.category}
                  onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
                  placeholder="e.g. Docs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="link-icon">Icon</Label>
                <Input
                  id="link-icon"
                  value={values.icon}
                  onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value }))}
                  placeholder="e.g. rocket"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : link ? "Save Changes" : "Create Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkCard({
  link,
  onEdit,
  onRequestDelete,
}: {
  link: QuickLinkDTO;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex flex-col gap-2 rounded-xl p-3.5 text-left",
        "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
          <Link2 className="h-3.5 w-3.5 text-[var(--accent)]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.title}</span>
      </a>

      {link.category && (
        <span className="w-fit truncate rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
          {link.category}
        </span>
      )}

      <div className="absolute top-2.5 right-2.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          aria-label="Edit link"
          title="Edit link"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete link"
          title="Delete link"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LinksTab({ project }: Props) {
  const [links, setLinks] = useState<QuickLinkDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLinkDTO | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/projects/${project._id}/links`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setLinks(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) toast.error("Could not load links.");
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
    fetch(`/api/modules/projects/${project._id}/links`)
      .then((res) => res.json())
      .then((data) => setLinks(Array.isArray(data) ? data : []));
  }

  async function handleSubmit(values: LinkFormValues) {
    const payload = {
      title: values.title.trim(),
      url: values.url.trim(),
      icon: values.icon.trim(),
      category: values.category.trim(),
    };
    const url = editing
      ? `/api/modules/projects/${project._id}/links/${editing._id}`
      : `/api/modules/projects/${project._id}/links`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    refresh();
    toast.success(editing ? "Link updated." : "Link created.");
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/projects/${project._id}/links/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete link.");
        return;
      }
      setLinks((prev) => prev?.filter((l) => l._id !== id) ?? prev);
      toast.success("Link deleted.");
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
          New Link
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !links || links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No links yet"
          description="Add quick links to dashboards, docs, or anything else useful for this project."
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
              New Link
            </Button>
          }
        />
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {links.map((l, i) => (
            <div key={l._id} style={{ "--i": i } as React.CSSProperties}>
              <LinkCard
                link={l}
                onEdit={() => {
                  setEditing(l);
                  setDialogOpen(true);
                }}
                onRequestDelete={() => setDeleteId(l._id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* key forces a clean remount when switching which link is being edited (or to
          create-mode) — without it, the dialog briefly showed the previous link's data in
          what should be a blank form, since its internal state only resyncs a tick later. */}
      <LinkFormDialog key={editing?._id ?? "new"} open={dialogOpen} onOpenChange={setDialogOpen} link={editing} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this link?"
        description="This permanently removes the link. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
