"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type ProjectDTO, type ProjectPriority, type ProjectStatus } from "../../db/collections";
import { TagsInput } from "../TagsInput";

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
  onProjectDeleted: () => void;
}

interface FormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags: string[];
  techStack: string[];
  startDate: string;
  targetDate: string;
}

function toFormValues(project: ProjectDTO): FormValues {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    tags: project.tags,
    techStack: project.techStack,
    startDate: project.startDate ? project.startDate.slice(0, 10) : "",
    targetDate: project.targetDate ? project.targetDate.slice(0, 10) : "",
  };
}

export function SettingsTab({ project, onProjectUpdated, onProjectDeleted }: Props) {
  const [formProjectId, setFormProjectId] = useState(project._id);
  const [values, setValues] = useState<FormValues>(() => toFormValues(project));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Re-seed the form whenever the user navigates from one project straight to another
  // (ProjectDetail isn't remounted on slug change). Adjusting state during render — rather
  // than in an effect — avoids the extra render pass an effect-based sync would trigger.
  if (project._id !== formProjectId) {
    setFormProjectId(project._id);
    setValues(toFormValues(project));
  }

  async function handleSave() {
    if (!values.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/modules/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          status: values.status,
          priority: values.priority,
          tags: values.tags,
          techStack: values.techStack,
          startDate: values.startDate,
          targetDate: values.targetDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save changes.");
        return;
      }
      onProjectUpdated(data as ProjectDTO);
      toast.success("Project updated.");
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/modules/projects/${project._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Could not delete project.");
        return;
      }
      toast.success("Project deleted.");
      onProjectDeleted();
    } catch {
      toast.error("Could not delete project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>Update this project&apos;s details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Dev Nexus"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                placeholder="What is this project about?"
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v as ProjectStatus }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select value={values.priority} onValueChange={(v) => setValues((s) => ({ ...s, priority: v as ProjectPriority }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-start">Start Date</Label>
                <Input
                  id="settings-start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-target">Target Date</Label>
                <Input
                  id="settings-target"
                  type="date"
                  value={values.targetDate}
                  onChange={(e) => setValues((v) => ({ ...v, targetDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <TagsInput values={values.tags} onChange={(tags) => setValues((v) => ({ ...v, tags }))} placeholder="Add tags…" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tech Stack</Label>
              <TagsInput
                values={values.techStack}
                onChange={(techStack) => setValues((v) => ({ ...v, techStack }))}
                placeholder="Add technologies…"
                ariaLabel="Add a technology"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Deleting a project permanently removes its meetings, links, contacts, and environments. Notes, files, and secrets linked to it
            are unassigned rather than deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={deleting} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete Project
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${project.name}"?`}
        description="This permanently removes its meetings, links, contacts, and environments. Notes, files, and secrets linked to it will be unassigned, not deleted. This cannot be undone."
        confirmLabel="Delete Project"
        destructive
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
