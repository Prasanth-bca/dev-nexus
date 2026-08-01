"use client";

import { Download, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import type { VaultFile } from "./types";

export function FilePreviewDialog({
  file,
  onOpenChange,
  onRequestDelete,
}: {
  file: VaultFile | null;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: () => void;
}) {
  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {file && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-6">{file.filename}</DialogTitle>
            </DialogHeader>

            <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-md bg-muted">
              {file.category === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content
                <img
                  src={`/api/modules/file-vault/files/${file.id}/content`}
                  alt={file.filename}
                  className="max-h-[60vh] w-auto object-contain"
                />
              ) : file.category === "pdf" ? (
                <iframe src={`/api/modules/file-vault/files/${file.id}/content`} title={file.filename} className="h-[60vh] w-full" />
              ) : (
                <p className="p-8 text-sm text-muted-foreground">No inline preview for this file type — download it to view.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)} · {file.mimeType} · uploaded {formatRelativeTime(file.uploadedAt)}
            </p>

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
