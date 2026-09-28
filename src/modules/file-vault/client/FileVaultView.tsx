"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  CloudUpload,
  File as FileIcon,
  FileImage,
  FileText,
  Files,
  LayoutGrid,
  List,
  Search,
  Upload,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { FileCard } from "./FileCard";
import { FilePreviewDialog } from "./FilePreviewDialog";
import type { FileCategory, VaultFile } from "./types";
import { useRequestGuard } from "@/hooks/use-request-guard";

const CATEGORIES: { value: FileCategory | "all"; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "All", icon: Files },
  { value: "image", label: "Images", icon: FileImage },
  { value: "pdf", label: "PDFs", icon: FileText },
  { value: "document", label: "Documents", icon: FileText },
  { value: "other", label: "Other", icon: FileIcon },
];

const VIEWS: { value: "grid" | "list"; label: string; icon: LucideIcon }[] = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
];

const accent = getModuleAccent("file-vault");

/** Every toolbar control shares one height: 44px touch target on mobile, compact on desktop. */
const CONTROL_HEIGHT = "h-11 sm:h-9";

export function FileVaultView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FileCategory | "all">("all");
  const [files, setFiles] = useState<VaultFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Presentation-only additions: which layout the grid renders in, the name of the
  // in-flight upload (for the progress tile), and whether a file is hovering the drop zone.
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave fire for every descendant, so depth-count instead of toggling.
  const dragDepth = useRef(0);
  // Lazily seeded from ?open=<id> (Global Search / Command Palette / widget deep link) — the file
  // itself comes from the list fetch below, so no separate detail request is needed.
  const [previewId, setPreviewId] = useState<string | null>(() => searchParams.get("open"));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const listGuard = useRequestGuard();

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setLoading(true);
        const token = listGuard.start();
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (category !== "all") params.set("category", category);
        fetch(`/api/modules/file-vault/files?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            // A search/filter change fired a newer request while this one was still in
            // flight — applying this response now would show results for the old query.
            if (listGuard.isCurrent(token)) setFiles(Array.isArray(data) ? data : []);
          })
          .finally(() => {
            if (listGuard.isCurrent(token)) setLoading(false);
          });
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  // Deep-link support (e.g. from Global Search / Command Palette): open whatever ?open=
  // currently points at, even if it changes while already on this page (not just on first load).
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const timeout = setTimeout(() => setPreviewId(openId), 0);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  /** Whether an uploaded file belongs in the currently-filtered view — mirrors the server's
   *  category/filename filtering closely enough to decide whether to show it immediately. */
  function matchesActiveFilter(file: VaultFile): boolean {
    if (category !== "all" && file.category !== category) return false;
    if (query.trim() && !file.filename.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  }

  /** The single upload path — the file input and the drop zone both call this. */
  function uploadFile(file: File) {
    setUploading(true);
    setUploadingName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/modules/file-vault/files", { method: "POST", body: formData })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Upload failed.");
          return;
        }
        // Filtered to "Images" and uploading a PDF shouldn't make it appear in that view —
        // it'll show up once the filter no longer excludes it.
        setFiles((prev) => {
          if (!matchesActiveFilter(data)) return prev;
          return prev ? [data, ...prev] : [data];
        });
        toast.success(`${data.filename} uploaded.`);
      })
      .finally(() => {
        setUploading(false);
        setUploadingName(null);
      });
  }

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file);
  }

  function hasFiles(e: DragEvent<HTMLDivElement>) {
    return Array.from(e.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    // Without preventDefault the browser navigates to the dropped file instead of firing onDrop.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleProjectChange(id: string, projectId: string) {
    fetch(`/api/modules/file-vault/files/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    })
      .then((res) => res.json())
      .then((updated: VaultFile) => {
        setFiles((prev) => prev?.map((f) => (f.id === id ? updated : f)) ?? prev);
      })
      .catch(() => toast.error("Could not update project assignment."));
  }

  function handleDelete(id: string) {
    fetch(`/api/modules/file-vault/files/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) {
        toast.error("Could not delete file.");
        return;
      }
      setFiles((prev) => prev?.filter((f) => f.id !== id) ?? prev);
      setPreviewId((prev) => (prev === id ? null : prev));
      toast.success("File deleted.");
    });
  }

  const previewFile = files?.find((f) => f.id === previewId) ?? null;

  const uploadTile =
    view === "grid" ? (
      <div
        style={{ "--accent": accent } as React.CSSProperties}
        className="animate-scale-in flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-4"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
          <CloudUpload className="h-5 w-5 text-[var(--accent)]" />
        </span>
        <span className="w-full truncate text-center text-xs text-muted-foreground">{uploadingName}</span>
        <span className="h-1 w-full max-w-32 overflow-hidden rounded-full bg-foreground/10 dark:bg-white/10">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
        </span>
      </div>
    ) : (
      <div
        style={{ "--accent": accent } as React.CSSProperties}
        className="animate-scale-in flex items-center gap-3 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2.5 py-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
          <CloudUpload className="h-4 w-4 text-[var(--accent)]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">{uploadingName}</span>
          <span className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-foreground/10 dark:bg-white/10">
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
          </span>
        </span>
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={active}
                style={{ "--accent": accent } as React.CSSProperties}
                className={cn(
                  CONTROL_HEIGHT,
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  active
                    ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                    : "border-border bg-foreground/[0.03] text-muted-foreground hover:border-foreground/20 hover:text-foreground dark:bg-white/[0.04]"
                )}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              aria-label="Search files"
              className={cn(CONTROL_HEIGHT, "rounded-lg pl-9 text-sm")}
            />
          </div>

          <div
            className={cn(CONTROL_HEIGHT, "flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-foreground/[0.03] p-0.5 dark:bg-white/[0.04]")}
            role="group"
            aria-label="Layout"
          >
            {VIEWS.map((v) => {
              const active = view === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setView(v.value)}
                  aria-label={v.label}
                  aria-pressed={active}
                  style={{ "--accent": accent } as React.CSSProperties}
                  className={cn(
                    "flex h-full w-10 items-center justify-center rounded-md transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:w-8",
                    active
                      ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drop zone wraps the whole collection area so a file can be dropped anywhere
          over the grid; it funnels into uploadFile(), the same path the input uses. */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ "--accent": accent } as React.CSSProperties}
        className={cn(
          "relative min-h-64 rounded-xl border border-dashed transition-colors duration-200",
          dragging
            ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] p-3"
            : "border-transparent"
        )}
      >
        {dragging && (
          <div className="animate-fade-in pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/70">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">
              <CloudUpload className="h-5 w-5 text-[var(--accent)]" />
            </span>
            <p className="text-sm font-medium">Drop to upload</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
            ))}
          </div>
        ) : !files || files.length === 0 ? (
          uploading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{uploadTile}</div>
          ) : (
            <EmptyState
              icon={Vault}
              title="No files yet"
              description="Upload an image, PDF, or document — or drop one anywhere on this area."
              accent={accent}
            />
          )
        ) : view === "grid" ? (
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {uploading && uploadTile}
            {files.map((f, i) => (
              <div key={f.id} style={{ "--i": i } as React.CSSProperties}>
                <FileCard file={f} view="grid" onOpen={() => setPreviewId(f.id)} onRequestDelete={() => setDeleteId(f.id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="stagger flex flex-col gap-1.5">
            {uploading && uploadTile}
            {files.map((f, i) => (
              <div key={f.id} style={{ "--i": i } as React.CSSProperties}>
                <FileCard file={f} view="list" onOpen={() => setPreviewId(f.id)} onRequestDelete={() => setDeleteId(f.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <FilePreviewDialog
        file={previewFile}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onRequestDelete={() => {
          if (previewFile) setDeleteId(previewFile.id);
        }}
        onProjectChange={(projectId) => {
          if (previewFile) handleProjectChange(previewFile.id, projectId);
        }}
      />

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
