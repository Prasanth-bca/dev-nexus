"use client";

import { File, FileImage, FileText, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { FileCategory, VaultFile } from "./types";

const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  other: File,
};

const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "Image",
  pdf: "PDF",
  document: "Doc",
  other: "File",
};

const accent = getModuleAccent("file-vault");

export function FileCard({
  file,
  onOpen,
  onRequestDelete,
  view = "grid",
}: {
  file: VaultFile;
  onOpen: () => void;
  onRequestDelete: () => void;
  /** Presentation-only: the vault's grid/list toggle. Behaviour is identical in both. */
  view?: "grid" | "list";
}) {
  const Icon = CATEGORY_ICON[file.category];
  const isImage = file.category === "image";
  const meta = `${formatBytes(file.size)} · ${formatRelativeTime(file.uploadedAt)}`;

  const deleteButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete ${file.filename}`}
      onClick={(e) => {
        e.stopPropagation();
        onRequestDelete();
      }}
      className={cn(
        "size-11 shrink-0 text-muted-foreground hover:text-destructive sm:size-7",
        view === "grid" &&
          "absolute top-2 right-2 border border-border bg-background/85 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100"
      )}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );

  // Solid card surface, never .glass — a card whose whole point is showing a file
  // preview must not sit behind a backdrop blur.
  if (view === "list") {
    return (
      <div
        style={{ "--accent": accent } as React.CSSProperties}
        className="group relative flex items-center gap-3 rounded-xl border border-border bg-card px-2.5 py-2 transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05]"
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-foreground/[0.04] dark:bg-white/[0.05]">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content, not a static/public asset next/image can optimize
              <img
                src={`/api/modules/file-vault/files/${file.id}/content`}
                alt={file.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <Icon className="h-4 w-4 text-[var(--accent)]" />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{file.filename}</span>
            <span className="truncate text-xs text-muted-foreground">{meta}</span>
          </span>
        </button>

        <span className="hidden shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] sm:inline-block">
          {CATEGORY_LABEL[file.category]}
        </span>

        {deleteButton}
      </div>
    );
  }

  return (
    <div
      style={{ "--accent": accent } as React.CSSProperties}
      className="lift group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${file.filename}`}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-foreground/[0.04] outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40 dark:bg-white/[0.05]"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content, not a static/public asset next/image can optimize
          <img
            src={`/api/modules/file-vault/files/${file.id}/content`}
            alt={file.filename}
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] transition-transform duration-200 ease-out group-hover:scale-[1.06]">
            <Icon className="h-6 w-6 text-[var(--accent)]" />
          </span>
        )}

        <span className="absolute top-2 left-2 rounded-full border border-border bg-background/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
          {CATEGORY_LABEL[file.category]}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col gap-0.5 rounded-b-xl border-t border-border px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
      >
        <span className="truncate text-sm font-medium">{file.filename}</span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </button>

      {deleteButton}
    </div>
  );
}
