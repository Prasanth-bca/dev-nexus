import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "projects",
  name: "Projects",
  category: "core",
  icon: "FolderKanban",
  version: "0.1.0",
  description:
    "A central workspace that organizes and links what already exists across Dev Nexus — repos, notes, files, secrets, meetings, and more — around each project, without duplicating any of it.",
  highlights: [
    "Links repos, notes, files, and secrets to a project instead of copying them",
    "Meetings, quick links, contacts, tech stack, and environments per project",
    "Project-scoped activity feed and dashboard overview",
  ],
  navEntry: { label: "Projects", path: "/dashboard/projects" },
  requiredSecrets: [],
  emits: ["projects.created", "projects.updated", "projects.deleted"],
  defaultEnabled: true,
};
