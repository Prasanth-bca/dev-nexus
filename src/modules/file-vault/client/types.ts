export type FileCategory = "image" | "pdf" | "document" | "other";

export interface VaultFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  projectId?: string;
  uploadedAt: string;
}
