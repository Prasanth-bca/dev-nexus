import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "activity",
  name: "Activity",
  category: "core",
  icon: "History",
  version: "0.1.0",
  navEntry: { label: "Activity", path: "/dashboard/activity" },
  requiredSecrets: [],
  // Doesn't publish domain events of its own — it only subscribes to every other module's.
  emits: [],
  defaultEnabled: true,
};
