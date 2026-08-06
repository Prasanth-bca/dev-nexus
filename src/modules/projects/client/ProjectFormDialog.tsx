"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type ProjectDTO, type ProjectPriority, type ProjectStatus } from "../db/collections";
import { TagsInput } from "./TagsInput";

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags: string[];
  techStack: string[];
  startDate: string;
  targetDate: string;
}

function toFormValues(project: ProjectDTO | null): ProjectFormValues {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "Planning",
    priority: project?.priority ?? "Medium",
    tags: project?.tags ?? [],
    techStack: project?.techStack ?? [],
    startDate: project?.startDate ? project.startDate.slice(0, 10) : "",
    targetDate: project?.targetDate ? project.targetDate.slice(0, 10) : "",
  };
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = creating a new project; a ProjectDTO = editing that project. */
  project: ProjectDTO | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setValues(toFormValues(project));
      setError(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, project]);

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
            <DialogTitle>{project ? "Edit Project" : "Create Project"}</DialogTitle>
            <DialogDescription>
              {project ? "Update this project's details." : "Set up a new workspace to organize repos, notes, files, and more."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Dev Nexus"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
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
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select value={values.priority} onValueChange={(v) => setValues((s) => ({ ...s, priority: v as ProjectPriority }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-start">Start Date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-target">Target Date</Label>
                <Input
                  id="project-target"
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

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : project ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
