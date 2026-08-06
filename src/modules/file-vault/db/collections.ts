export const FILE_VAULT_COLLECTION = "file_vault_items";

export type FileCategory = "image" | "pdf" | "document" | "other";

export interface FileVaultDoc {
  filename: string;
  /** Generated on-disk key (see server/storage.ts) — never the original filename. */
  storageKey: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  /** Optional Projects-module link, stored as a plain string (the project's ObjectId). */
  projectId?: string;
  uploadedAt: Date;
}

export interface FileVaultDTO {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  projectId?: string;
  uploadedAt: string;
}

export function categorize(mimeType: string): FileCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/") || mimeType === "application/rtf" || mimeType.includes("officedocument") || mimeType === "application/msword") {
    return "document";
  }
  return "other";
}

export function toDTO(id: string, doc: FileVaultDoc): FileVaultDTO {
  return {
    id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    size: doc.size,
    category: doc.category,
    projectId: doc.projectId,
    uploadedAt: doc.uploadedAt.toISOString(),
  };
}
