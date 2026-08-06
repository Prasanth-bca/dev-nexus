"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Download, File as FileIcon, FileImage, FileText, Trash2, Upload, Vault, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import type { ProjectDTO } from "../../db/collections";
import type { FileVaultDTO } from "../../../file-vault/db/collections";

const ACCENT = getModuleAccent("projects");

interface Props {
  project: ProjectDTO;
  onProjectUpdated: (project: ProjectDTO) => void;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  other: FileIcon,
};

export function FilesTab({ project }: Props) {
  const [files, setFiles] = useState<FileVaultDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/modules/file-vault/files?projectId=${project._id}`)
        .then((res) => res.json())
        .then((data) => setFiles(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, [project._id]);

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", project._id);
    fetch("/api/modules/file-vault/files", { method: "POST", body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Upload failed.");
          return;
        }
        setFiles((prev) => (prev ? [data, ...prev] : [data]));
        toast.success(`${data.filename} uploaded.`);
      })
      .catch(() => toast.error("Upload failed."))
      .finally(() => setUploading(false));
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/file-vault/files/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete file.");
        return;
      }
      setFiles((prev) => prev?.filter((f) => f.id !== id) ?? prev);
      toast.success("File deleted.");
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {files && files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"}` : "No files yet"}
        </p>
        {/* A <label> wrapping a visually-hidden input — an <input> can't legally nest inside a
            <button>, so the label carries the button styling instead (same pattern as FileVaultView). */}
        <label
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "cursor-pointer gap-1.5",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          <Upload className={cn("h-3.5 w-3.5", uploading && "animate-pulse")} />
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" onChange={handleUpload} disabled={uploading} className="sr-only" />
        </label>
      </div>

      {!files || files.length === 0 ? (
        <EmptyState
          icon={Vault}
          accent={ACCENT}
          title="No files linked to this project"
          description="Upload a file to keep it attached to this project."
        />
      ) : (
        <div className="stagger flex flex-col gap-2">
          {files.map((f, i) => {
            const Icon = CATEGORY_ICONS[f.category] ?? FileIcon;
            return (
              <div key={f.id} style={{ "--i": i } as React.CSSProperties} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.filename}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span>{formatBytes(f.size)}</span>
                    <span className="capitalize">{f.category}</span>
                    <span>{formatRelativeTime(f.uploadedAt)}</span>
                  </div>
                </div>
                <a
                  href={`/api/modules/file-vault/files/${f.id}/content`}
                  download={f.filename}
                  aria-label={`Download ${f.filename}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
                >
                  <Download className="h-4 w-4" />
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${f.filename}`}
                  onClick={() => setDeleteId(f.id)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this file?"
        description="This permanently deletes the file from disk. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
    </div>
  );
}
