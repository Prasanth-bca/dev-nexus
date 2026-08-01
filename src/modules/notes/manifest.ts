import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "notes",
  name: "Notes",
  category: "core",
  icon: "StickyNote",
  version: "0.2.0",
  description:
    "A Markdown knowledge base with AI assistance — write, organise, and rediscover notes without leaving the platform.",
  highlights: [
    "Markdown editor with live preview and syntax-highlighted code blocks",
    "AI-generated summaries and suggested categories or tags",
    "Semantic search that matches meaning, not just keywords, using an on-device embedding model",
    "Related-notes discovery via shared tags and categories",
  ],
  navEntry: { label: "Notes", path: "/dashboard/notes" },
  requiredSecrets: [],
  emits: ["notes.created", "notes.updated", "notes.deleted"],
  defaultEnabled: true,
};
