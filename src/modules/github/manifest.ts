import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "github",
  name: "GitHub",
  category: "integration",
  icon: "FolderGit2",
  version: "0.1.0",
  navEntry: { label: "GitHub", path: "/dashboard/github" },
  // GITHUB_TOKEN is entered directly in Settings (a personal access token, not an OAuth exchange).
  requiredSecrets: ["GITHUB_TOKEN"],
  emits: ["github.connected", "github.disconnected"],
  defaultEnabled: true,
};
