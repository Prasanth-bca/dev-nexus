"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ProjectDTO } from "../db/collections";
import type { ProjectFormValues } from "./ProjectFormDialog";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectsHomeView } from "./ProjectsHomeView";
import { ProjectDetail } from "./ProjectDetail";

function toBody(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description,
    status: values.status,
    priority: values.priority,
    tags: values.tags,
    techStack: values.techStack,
    startDate: values.startDate || "",
    targetDate: values.targetDate || "",
  };
}

export function ProjectsWorkspace({ initialProjects }: { initialProjects: ProjectDTO[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<ProjectDTO[]>(initialProjects);
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectDTO | null>(null);

  const activeSlug = searchParams.get("project");
  const active = activeSlug ? (projects.find((p) => p.slug === activeSlug) ?? null) : null;

  // A deep link to a slug that isn't in the already-loaded list (e.g. Global Search hit an
  // older cache) fetches it directly by slug rather than showing a false "not found".
  const [fetchedActive, setFetchedActive] = useState<ProjectDTO | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!activeSlug || active) {
        setFetchedActive(null);
        return;
      }
      fetch(`/api/modules/projects/slug/${encodeURIComponent(activeSlug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setFetchedActive);
    }, 0);
    return () => clearTimeout(timeout);
  }, [activeSlug, active]);

  const openProject = active ?? fetchedActive;

  function goHome() {
    router.push("/dashboard/projects");
  }

  function openDetail(project: ProjectDTO) {
    router.push(`/dashboard/projects?project=${project.slug}`);
  }

  const patchProject = useCallback((updated: ProjectDTO) => {
    setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  async function handleCreate(values: ProjectFormValues) {
    const res = await fetch("/api/modules/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBody(values)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not create project.");
    setProjects((prev) => [data, ...prev]);
    router.replace(`/dashboard/projects?project=${data.slug}`);
  }

  async function handleEditSubmit(values: ProjectFormValues) {
    if (!editingProject) return;
    const res = await fetch(`/api/modules/projects/${editingProject._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBody(values)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save project.");
    setProjects((prev) => prev.map((p) => (p._id === data._id ? data : p)));
    if (activeSlug && activeSlug !== data.slug) router.replace(`/dashboard/projects?project=${data.slug}`);
  }

  async function handleDelete(project: ProjectDTO) {
    await fetch(`/api/modules/projects/${project._id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p._id !== project._id));
    if (activeSlug === project.slug) goHome();
  }

  function closeForm(open: boolean) {
    setFormOpen(open);
    if (!open) {
      setEditingProject(null);
      if (searchParams.get("new") === "1") router.replace("/dashboard/projects");
    }
  }

  if (activeSlug) {
    if (!openProject) return null;
    return (
      <>
        <ProjectDetail
          project={openProject}
          onBack={goHome}
          onEdit={() => {
            setEditingProject(openProject);
            setFormOpen(true);
          }}
          onProjectUpdated={patchProject}
          onProjectDeleted={goHome}
        />
        <ProjectFormDialog open={formOpen} onOpenChange={closeForm} project={editingProject} onSubmit={handleEditSubmit} />
      </>
    );
  }

  return (
    <>
      <ProjectsHomeView
        projects={projects}
        onOpen={openDetail}
        onCreate={() => {
          setEditingProject(null);
          setFormOpen(true);
        }}
        onEdit={(project) => {
          setEditingProject(project);
          setFormOpen(true);
        }}
        onRequestDelete={setPendingDelete}
      />

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={closeForm}
        project={editingProject}
        onSubmit={editingProject ? handleEditSubmit : handleCreate}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete ? `Delete "${pendingDelete.name}"?` : "Delete project?"}
        description="This removes the project and its meetings, links, contacts, and environments. Linked notes, files, and secrets are unassigned, not deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
      />
    </>
  );
}
