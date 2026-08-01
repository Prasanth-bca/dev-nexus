import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "file-vault",
  name: "File Vault",
  category: "productivity",
  icon: "Vault",
  version: "0.1.0",
  description: "Local-disk storage for images, PDFs, and documents, with inline preview and no third-party upload service.",
  highlights: [
    "Drag-and-drop or click to upload, with files written to local disk rather than cloud storage",
    "Inline preview for images and PDFs; download for everything else",
    "Filter by category and search by filename",
    "Stored under generated identifiers, so user-supplied filenames never reach the filesystem",
  ],
  navEntry: { label: "File Vault", path: "/dashboard/file-vault" },
  requiredSecrets: [],
  emits: ["file-vault.uploaded", "file-vault.deleted"],
  defaultEnabled: true,
};
