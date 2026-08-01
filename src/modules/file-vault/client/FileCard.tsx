"use client";

import { File, FileImage, FileText, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import type { FileCategory, VaultFile } from "./types";

const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  other: File,
};

export function FileCard({
  file,
  onOpen,
  onRequestDelete,
}: {
  file: VaultFile;
  onOpen: () => void;
  onRequestDelete: () => void;
}) {
  const Icon = CATEGORY_ICON[file.category];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border transition-colors hover:border-foreground/20">
      <button type="button" onClick={onOpen} className="flex aspect-square w-full items-center justify-center overflow-hidden bg-muted">
        {file.category === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content, not a static/public asset next/image can optimize
          <img src={`/api/modules/file-vault/files/${file.id}/content`} alt={file.filename} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
      </button>

      <button type="button" onClick={onOpen} className="flex flex-col gap-0.5 px-2.5 py-2 text-left">
        <span className="truncate text-sm font-medium">{file.filename}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · {formatRelativeTime(file.uploadedAt)}
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
        className="absolute top-1.5 right-1.5 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
