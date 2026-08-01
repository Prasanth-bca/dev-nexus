import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "file-vault",
  name: "File Vault",
  category: "productivity",
  icon: "Vault",
  version: "0.1.0",
  navEntry: { label: "File Vault", path: "/dashboard/file-vault" },
  requiredSecrets: [],
  emits: ["file-vault.uploaded", "file-vault.deleted"],
  defaultEnabled: true,
};
