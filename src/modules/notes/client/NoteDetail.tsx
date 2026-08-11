"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Check, Download, Maximize2, Minimize2, Pencil, Pin, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProjectSelect, useProjects } from "@/components/project-select";
import { CATEGORIES, TEMPLATES } from "../constants";
import { MarkdownEditor } from "./MarkdownEditor";
import { SuggestButton } from "./SuggestButton";
import { SummaryPanel } from "./SummaryPanel";
import { RelatedNotesPanel } from "./RelatedNotesPanel";

/**
 * Lazy-loaded — MarkdownPreview pulls in react-markdown/remark-gfm/rehype-highlight plus a
 * highlight.js stylesheet, which a performance audit found were shipping in Notes' initial
 * JS chunk even before any note was ever opened in preview mode. This defers that weight to
 * first actual use instead, with no change to what renders once it loads.
 */
const MarkdownPreview = dynamic(() => import("./MarkdownPreview").then((m) => m.MarkdownPreview), {
  loading: () => <div className="h-24 w-full animate-pulse rounded-lg bg-foreground/[0.04] dark:bg-white/[0.05]" />,
});

const ACCENT = "var(--module-notes)";

export interface NoteDraft {
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  projectId?: string;
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  function commit() {
    const value = input.trim().replace(/,$/, "");
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setInput("");
  }

  return (
    <div className="focus-glow flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-foreground/[0.03] px-2 py-1 transition-all duration-200 dark:bg-white/[0.04]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs dark:bg-white/[0.08]"
        >
          #{tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        aria-label="Add a tag"
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.trim().replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase() || "note"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function NoteDetail({
  noteId,
  draft,
  isNew,
  mode,
  saving,
  fullView,
  summary,
  summaryGeneratedAt,
  onChange,
  onEnterEdit,
  onSave,
  onClose,
  onRequestDelete,
  onToggleFullView,
  onOpenNote,
  onSummaryGenerated,
}: {
  noteId: string | null;
  draft: NoteDraft;
  isNew: boolean;
  mode: "preview" | "edit";
  saving: boolean;
  fullView: boolean;
  summary?: string;
  summaryGeneratedAt?: string;
  onChange: (patch: Partial<NoteDraft>) => void;
  onEnterEdit: () => void;
  onSave: () => void;
  onClose: () => void;
  onRequestDelete: () => void;
  onToggleFullView: () => void;
  onOpenNote: (id: string) => void;
  onSummaryGenerated: (summary: string, generatedAt: string) => void;
}) {
  const isEditing = mode === "edit";
  const showTemplates = isNew && isEditing && !draft.content;
  const projects = useProjects();
  const assignedProject = draft.projectId ? projects.find((p) => p._id === draft.projectId) : undefined;

  return (
    <div
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className="animate-fade-in flex min-w-0 flex-1 flex-col gap-3 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          {isEditing ? (
            <input
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Note title"
              aria-label="Note title"
              autoFocus
              className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
            />
          ) : (
            <h1 className="truncate text-lg font-semibold tracking-tight">{draft.title || "Untitled"}</h1>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isEditing ? (
              <select
                value={draft.category}
                onChange={(e) => onChange({ category: e.target.value })}
                aria-label="Note category"
                className="rounded-lg border border-input bg-foreground/[0.03] px-2 py-1 text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 dark:bg-white/[0.04]"
              >
                <option value="">No category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              draft.category && (
                <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                  {draft.category}
                </span>
              )
            )}

            {isEditing ? (
              <TagsInput tags={draft.tags} onChange={(tags) => onChange({ tags })} />
            ) : (
              draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground dark:bg-white/[0.06]"
                >
                  #{tag}
                </span>
              ))
            )}

            {isEditing && noteId && (
              <SuggestButton noteId={noteId} onApply={(s) => onChange({ category: s.category || draft.category, tags: s.tags })} />
            )}

            {isEditing ? (
              <ProjectSelect value={draft.projectId ?? ""} onChange={(projectId) => onChange({ projectId })} projects={projects} />
            ) : (
              assignedProject && (
                <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground dark:bg-white/[0.06]">
                  {assignedProject.name}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange({ pinned: !draft.pinned })}
            aria-label={draft.pinned ? "Unpin note" : "Pin note"}
            aria-pressed={draft.pinned}
            className={cn(draft.pinned ? "text-[var(--accent)]" : "text-muted-foreground")}
          >
            <Pin className={cn("h-4 w-4", draft.pinned && "fill-current")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange({ favorite: !draft.favorite })}
            aria-label={draft.favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={draft.favorite}
            className={cn(draft.favorite ? "text-[var(--accent)]" : "text-muted-foreground")}
          >
            <Star className={cn("h-4 w-4", draft.favorite && "fill-current")} />
          </Button>

          <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />

          {isEditing ? (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saving || !draft.title.trim()}
              title={!draft.title.trim() ? "Add a title before saving" : "Save (Ctrl+S)"}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onEnterEdit} title="Edit (Ctrl+E)" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}

          {!isNew && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => downloadMarkdown(draft.title, draft.content)}
                aria-label="Export as Markdown"
                title="Export"
                className="text-muted-foreground"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRequestDelete}
                aria-label="Delete note"
                title="Delete"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFullView}
            aria-label={fullView ? "Exit full view" : "Enter full view"}
            title={fullView ? "Exit Full View" : "Full View"}
            className="text-muted-foreground"
          >
            {fullView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close note"
            title="Close (Esc)"
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isEditing && !draft.title.trim() && <span className="text-xs text-warning">Add a title to save</span>}

      {showTemplates && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Start from:</span>
          {TEMPLATES.map((t) => (
            <Button key={t.id} type="button" variant="outline" size="xs" onClick={() => onChange({ content: t.content })}>
              {t.name}
            </Button>
          ))}
        </div>
      )}

      {isEditing ? (
        <MarkdownEditor value={draft.content} onChange={(content) => onChange({ content })} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {noteId && (
            <SummaryPanel
              noteId={noteId}
              content={draft.content}
              summary={summary}
              summaryGeneratedAt={summaryGeneratedAt}
              onGenerated={onSummaryGenerated}
            />
          )}
          <MarkdownPreview content={draft.content} />
          {noteId && <RelatedNotesPanel key={noteId} noteId={noteId} onOpenNote={onOpenNote} />}
        </div>
      )}
    </div>
  );
}
