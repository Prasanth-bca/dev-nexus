"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { ContactDTO, ProjectDTO } from "../../db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface ContactFormValues {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

function toFormValues(contact: ContactDTO | null): ContactFormValues {
  return {
    name: contact?.name ?? "",
    role: contact?.role ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    notes: contact?.notes ?? "",
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactDTO | null;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ContactFormValues>(() => toFormValues(contact));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setValues(toFormValues(contact));
      setError(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, contact]);

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
            <DialogTitle>{contact ? "Edit Contact" : "New Contact"}</DialogTitle>
            <DialogDescription>
              {contact ? "Update this contact's details." : "Add a contact for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Jamie Rivera"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-role">Role</Label>
              <Input
                id="contact-role"
                value={values.role}
                onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
                placeholder="e.g. Product Manager"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                  placeholder="name@example.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                  placeholder="+1 555 010 1234"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
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
              {saving ? "Saving…" : contact ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContactRow({
  contact,
  onEdit,
  onRequestDelete,
}: {
  contact: ContactDTO;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex items-start gap-3 rounded-xl p-3.5",
        "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-xs font-semibold text-[var(--accent)]">
        {getInitials(contact.name)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate text-sm font-medium">{contact.name}</span>
          {contact.role && <span className="truncate text-xs text-muted-foreground">{contact.role}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-[var(--accent)] hover:underline">
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-[var(--accent)] hover:underline">
              {contact.phone}
            </a>
          )}
        </div>
        {contact.notes && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{contact.notes}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          aria-label="Edit contact"
          title="Edit contact"
          onClick={onEdit}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete contact"
          title="Delete contact"
          onClick={onRequestDelete}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ContactsTab({ project }: Props) {
  const [contacts, setContacts] = useState<ContactDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactDTO | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/projects/${project._id}/contacts`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setContacts(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) toast.error("Could not load contacts.");
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
    fetch(`/api/modules/projects/${project._id}/contacts`)
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []));
  }

  async function handleSubmit(values: ContactFormValues) {
    const payload = {
      name: values.name.trim(),
      role: values.role.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
    };
    const url = editing
      ? `/api/modules/projects/${project._id}/contacts/${editing._id}`
      : `/api/modules/projects/${project._id}/contacts`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    refresh();
    toast.success(editing ? "Contact updated." : "Contact created.");
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/projects/${project._id}/contacts/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete contact.");
        return;
      }
      setContacts((prev) => prev?.filter((c) => c._id !== id) ?? prev);
      toast.success("Contact deleted.");
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
          New Contact
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Keep track of the people involved in this project — clients, stakeholders, vendors."
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
              New Contact
            </Button>
          }
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {contacts.map((c, i) => (
            <div key={c._id} style={{ "--i": i } as React.CSSProperties}>
              <ContactRow
                contact={c}
                onEdit={() => {
                  setEditing(c);
                  setDialogOpen(true);
                }}
                onRequestDelete={() => setDeleteId(c._id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* key forces a clean remount when switching which contact is being edited (or to
          create-mode) — without it, the dialog briefly showed the previous contact's data in
          what should be a blank form, since its internal state only resyncs a tick later. */}
      <ContactFormDialog key={editing?._id ?? "new"} open={dialogOpen} onOpenChange={setDialogOpen} contact={editing} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this contact?"
        description="This permanently removes the contact. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
