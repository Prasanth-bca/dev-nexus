import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "notes",
  name: "Notes",
  category: "core",
  icon: "StickyNote",
  version: "0.2.0",
  navEntry: { label: "Notes", path: "/dashboard/notes" },
  requiredSecrets: [],
  emits: ["notes.created", "notes.updated", "notes.deleted"],
  defaultEnabled: true,
};
