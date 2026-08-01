"use client";

import { useState } from "react";
import { CATEGORIES, TEMPLATES } from "../constants";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { SuggestButton } from "./SuggestButton";
import { SummaryPanel } from "./SummaryPanel";
import { RelatedNotesPanel } from "./RelatedNotesPanel";

export interface NoteDraft {
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  function commit() {
    const value = input.trim().replace(/,$/, "");
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setInput("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">
          #{tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-zinc-400 hover:text-zinc-700">
            ×
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
        className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
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

function iconButtonClass(active: boolean) {
  return `text-sm px-2 py-1.5 rounded-md border transition-colors ${
    active ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800 opacity-50 hover:opacity-100"
  }`;
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

  return (
    <div className="flex-1 min-w-0 flex flex-col p-4 gap-3 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          {isEditing ? (
            <input
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Note title"
              autoFocus
              className="w-full text-lg font-semibold outline-none bg-transparent"
            />
          ) : (
            <h1 className="text-lg font-semibold truncate">{draft.title || "Untitled"}</h1>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {isEditing ? (
              <select
                value={draft.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="text-xs border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 bg-transparent"
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
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {draft.category}
                </span>
              )
            )}

            {isEditing ? (
              <TagsInput tags={draft.tags} onChange={(tags) => onChange({ tags })} />
            ) : (
              draft.tags.map((tag) => (
                <span key={tag} className="text-[11px] text-zinc-400">
                  #{tag}
                </span>
              ))
            )}

            {isEditing && noteId && (
              <SuggestButton noteId={noteId} onApply={(s) => onChange({ category: s.category || draft.category, tags: s.tags })} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={() => onChange({ pinned: !draft.pinned })} title="Pin" className={iconButtonClass(draft.pinned)}>
            📌
          </button>
          <button
            type="button"
            onClick={() => onChange({ favorite: !draft.favorite })}
            title="Favorite"
            className={iconButtonClass(draft.favorite)}
          >
            ⭐
          </button>

          <span className="w-px self-stretch bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {isEditing ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !draft.title.trim()}
              title={!draft.title.trim() ? "Add a title before saving" : "Save (Ctrl+S)"}
              className="text-sm px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "💾 Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnterEdit}
              title="Edit (Ctrl+E)"
              className="text-sm px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              ✏ Edit
            </button>
          )}

          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => downloadMarkdown(draft.title, draft.content)}
                title="Export"
                className="text-sm px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                ⬇
              </button>
              <button
                type="button"
                onClick={onRequestDelete}
                title="Delete"
                className="text-sm px-2 py-1.5 rounded-md border border-red-200 text-red-600 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                🗑
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleFullView}
            title={fullView ? "Exit Full View" : "Full View"}
            className="text-sm px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            {fullView ? "🗗" : "⛶"}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="text-sm px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
      </div>

      {isEditing && !draft.title.trim() && <span className="text-xs text-amber-600 dark:text-amber-500">Add a title to save</span>}

      {showTemplates && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Start from:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ content: t.content })}
              className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {isEditing ? (
        <MarkdownEditor value={draft.content} onChange={(content) => onChange({ content })} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
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
