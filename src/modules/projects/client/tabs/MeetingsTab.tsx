"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckSquare, Plus, Trash2, Users } from "lucide-react";
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
import type { MeetingDTO, ProjectDTO } from "../../db/collections";
import { TagsInput } from "../TagsInput";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

interface MeetingFormValues {
  title: string;
  date: string;
  attendees: string[];
  agenda: string;
  discussion: string;
  actionItems: string[];
  nextMeeting: string;
  recordingUrl: string;
}

function toFormValues(meeting: MeetingDTO | null): MeetingFormValues {
  return {
    title: meeting?.title ?? "",
    date: meeting?.date ? meeting.date.slice(0, 10) : "",
    attendees: meeting?.attendees ?? [],
    agenda: meeting?.agenda ?? "",
    discussion: meeting?.discussion ?? "",
    actionItems: meeting?.actionItems ?? [],
    nextMeeting: meeting?.nextMeeting ? meeting.nextMeeting.slice(0, 10) : "",
    recordingUrl: meeting?.recordingUrl ?? "",
  };
}

function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: MeetingDTO | null;
  onSubmit: (values: MeetingFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<MeetingFormValues>(() => toFormValues(meeting));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setValues(toFormValues(meeting));
      setError(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, meeting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!values.date) {
      setError("Date is required.");
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
            <DialogTitle>{meeting ? "Edit Meeting" : "New Meeting"}</DialogTitle>
            <DialogDescription>
              {meeting ? "Update this meeting's details." : "Log a meeting for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                value={values.title}
                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                placeholder="e.g. Sprint planning"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-date">Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={values.date}
                  onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-next">Next Meeting</Label>
                <Input
                  id="meeting-next"
                  type="date"
                  value={values.nextMeeting}
                  onChange={(e) => setValues((v) => ({ ...v, nextMeeting: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Attendees</Label>
              <TagsInput
                values={values.attendees}
                onChange={(attendees) => setValues((v) => ({ ...v, attendees }))}
                placeholder="Add attendee…"
                ariaLabel="Add an attendee"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-agenda">Agenda</Label>
              <Textarea
                id="meeting-agenda"
                value={values.agenda}
                onChange={(e) => setValues((v) => ({ ...v, agenda: e.target.value }))}
                placeholder="What's on the agenda?"
                className="min-h-16"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-discussion">Discussion</Label>
              <Textarea
                id="meeting-discussion"
                value={values.discussion}
                onChange={(e) => setValues((v) => ({ ...v, discussion: e.target.value }))}
                placeholder="Notes from the discussion…"
                className="min-h-16"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Action Items</Label>
              <TagsInput
                values={values.actionItems}
                onChange={(actionItems) => setValues((v) => ({ ...v, actionItems }))}
                placeholder="Add an action item…"
                ariaLabel="Add an action item"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-recording">Recording URL</Label>
              <Input
                id="meeting-recording"
                value={values.recordingUrl}
                onChange={(e) => setValues((v) => ({ ...v, recordingUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : meeting ? "Save Changes" : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetingCard({
  meeting,
  onEdit,
  onRequestDelete,
}: {
  meeting: MeetingDTO;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const formattedDate = new Date(meeting.date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEdit();
      }}
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className={cn(
        "group lift glass relative flex cursor-pointer flex-col gap-2 rounded-xl p-3.5 text-left",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      )}
    >
      <span
        aria-hidden
        className="absolute top-3 bottom-3 left-0 w-[3px] scale-y-0 rounded-r-full bg-[var(--accent)] transition-transform duration-200 group-hover:scale-y-100"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{meeting.title}</span>
            <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Delete meeting"
          title="Delete meeting"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors duration-200 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {meeting.agenda && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{meeting.agenda}</p>}

      <div className="mt-auto flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
          <Users className="h-3 w-3" />
          {meeting.attendees.length}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-white/[0.06]">
          <CheckSquare className="h-3 w-3" />
          {meeting.actionItems.length}
        </span>
      </div>
    </div>
  );
}

export function MeetingsTab({ project }: Props) {
  const [meetings, setMeetings] = useState<MeetingDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingDTO | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/projects/${project._id}/meetings`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setMeetings(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) toast.error("Could not load meetings.");
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
    fetch(`/api/modules/projects/${project._id}/meetings`)
      .then((res) => res.json())
      .then((data) => setMeetings(Array.isArray(data) ? data : []));
  }

  async function handleSubmit(values: MeetingFormValues) {
    const payload = {
      title: values.title.trim(),
      date: values.date,
      attendees: values.attendees,
      agenda: values.agenda,
      discussion: values.discussion,
      actionItems: values.actionItems,
      nextMeeting: values.nextMeeting,
      recordingUrl: values.recordingUrl.trim(),
    };
    const url = editing
      ? `/api/modules/projects/${project._id}/meetings/${editing._id}`
      : `/api/modules/projects/${project._id}/meetings`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    refresh();
    toast.success(editing ? "Meeting updated." : "Meeting created.");
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/projects/${project._id}/meetings/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete meeting.");
        return;
      }
      setMeetings((prev) => prev?.filter((m) => m._id !== id) ?? prev);
      toast.success("Meeting deleted.");
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
          New Meeting
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !meetings || meetings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No meetings logged yet"
          description="Track meeting notes, attendees, and action items for this project."
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
              New Meeting
            </Button>
          }
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {meetings.map((m, i) => (
            <div key={m._id} style={{ "--i": i } as React.CSSProperties}>
              <MeetingCard
                meeting={m}
                onEdit={() => {
                  setEditing(m);
                  setDialogOpen(true);
                }}
                onRequestDelete={() => setDeleteId(m._id)}
              />
            </div>
          ))}
        </div>
      )}

      <MeetingFormDialog open={dialogOpen} onOpenChange={setDialogOpen} meeting={editing} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this meeting?"
        description="This permanently deletes the meeting notes. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
