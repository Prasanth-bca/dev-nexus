import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "activity",
  name: "Activity",
  category: "core",
  icon: "History",
  version: "0.1.0",
  description: "An automatic audit trail of everything that happens across the platform, assembled from the kernel event bus.",
  highlights: [
    "Subscribes to every module's events without those modules knowing it exists",
    "Curated to meaningful actions — creations, deletions, sends — rather than routine noise",
    "Grouped by day and colour-coded by originating module",
    "Distinguishes actions you took from actions the AI Assistant took on your behalf",
  ],
  navEntry: { label: "Activity", path: "/dashboard/activity" },
  requiredSecrets: [],
  // Doesn't publish domain events of its own — it only subscribes to every other module's.
  emits: [],
  defaultEnabled: true,
};
