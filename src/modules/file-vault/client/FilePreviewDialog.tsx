"use client";

import { Download, FileQuestion, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { getModuleAccent } from "@/lib/icon-map";
import { ProjectSelect, useProjects } from "@/components/project-select";
import type { VaultFile } from "./types";

const accent = getModuleAccent("file-vault");

const META_PILL =
  "rounded-full border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-white/[0.05]";

export function FilePreviewDialog({
  file,
  onOpenChange,
  onRequestDelete,
  onProjectChange,
}: {
  file: VaultFile | null;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: () => void;
  onProjectChange: (projectId: string) => void;
}) {
  const projects = useProjects();

  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent style={{ "--accent": accent } as React.CSSProperties} className="sm:max-w-3xl">
        {file && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{file.filename}</DialogTitle>
            </DialogHeader>

            {/* Solid stage — the preview itself is a reading surface, so no blur here
                even though the surrounding dialog is glass. */}
            <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-xl border border-border bg-background/60">
              {file.category === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content
                <img
                  src={`/api/modules/file-vault/files/${file.id}/content`}
                  alt={file.filename}
                  className="animate-fade-in max-h-[60vh] w-auto object-contain"
                />
              ) : file.category === "pdf" ? (
                <iframe
                  src={`/api/modules/file-vault/files/${file.id}/content`}
                  title={file.filename}
                  className="animate-fade-in h-[60vh] w-full rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
                    <FileQuestion className="h-5 w-5 text-[var(--accent)]" />
                  </span>
                  <p className="max-w-xs text-sm text-balance text-muted-foreground">
                    No inline preview for this file type — download it to view.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                {formatBytes(file.size)}
              </span>
              <span className={`${META_PILL} font-mono`}>{file.mimeType}</span>
              <span className={META_PILL}>uploaded {formatRelativeTime(file.uploadedAt)}</span>
            </div>

            <ProjectSelect
              value={file.projectId ?? ""}
              onChange={onProjectChange}
              projects={projects}
              className="h-8 w-full rounded-lg border border-input bg-foreground/[0.03] px-2.5 text-sm outline-none dark:bg-white/[0.04]"
            />

            <DialogFooter>
              <Button type="button" variant="destructive" onClick={onRequestDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <a
                href={`/api/modules/file-vault/files/${file.id}/content`}
                download={file.filename}
                className={buttonVariants({ variant: "outline" })}
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
