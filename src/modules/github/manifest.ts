import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "github",
  name: "GitHub",
  category: "integration",
  icon: "FolderGit2",
  version: "0.1.0",
  description: "A read-only window onto your repositories — branches, commits, pull requests, and issues at a glance.",
  highlights: [
    "Connects with a personal access token, validated before it is stored",
    "Browse repositories with language, star, and visibility indicators",
    "Inspect branches, commit history, pull requests, and issues per repository",
    "Repositories are searchable from the global command palette",
  ],
  navEntry: { label: "GitHub", path: "/dashboard/github" },
  // GITHUB_TOKEN is entered directly in Settings (a personal access token, not an OAuth exchange).
  requiredSecrets: ["GITHUB_TOKEN"],
  emits: ["github.connected", "github.disconnected"],
  defaultEnabled: true,
};
