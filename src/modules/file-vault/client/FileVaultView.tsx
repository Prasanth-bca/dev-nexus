"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Upload, Vault } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FileCard } from "./FileCard";
import { FilePreviewDialog } from "./FilePreviewDialog";
import type { FileCategory, VaultFile } from "./types";

const CATEGORIES: { value: FileCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Documents" },
  { value: "other", label: "Other" },
];

export function FileVaultView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FileCategory | "all">("all");
  const [files, setFiles] = useState<VaultFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Lazily seeded from ?open=<id> (Global Search / Command Palette / widget deep link) — the file
  // itself comes from the list fetch below, so no separate detail request is needed.
  const [previewId, setPreviewId] = useState<string | null>(() => searchParams.get("open"));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (category !== "all") params.set("category", category);
        fetch(`/api/modules/file-vault/files?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => setFiles(Array.isArray(data) ? data : []))
          .finally(() => setLoading(false));
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
  }, [query, category]);

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
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
      .finally(() => setUploading(false));
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="File Vault"
        description="Store and browse images, PDFs, and documents."
        actions={
          <label className={`${buttonVariants({ variant: "default" })} cursor-pointer`}>
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" onChange={handleUpload} disabled={uploading} className="sr-only" />
          </label>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={(v) => setCategory(v as FileCategory | "all")}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="h-8 pl-8 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : !files || files.length === 0 ? (
        <EmptyState icon={Vault} title="No files yet" description="Upload an image, PDF, or document to get started." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {files.map((f) => (
            <FileCard key={f.id} file={f} onOpen={() => setPreviewId(f.id)} onRequestDelete={() => setDeleteId(f.id)} />
          ))}
        </div>
      )}

      <FilePreviewDialog
        file={previewFile}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onRequestDelete={() => {
          if (previewFile) setDeleteId(previewFile.id);
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
