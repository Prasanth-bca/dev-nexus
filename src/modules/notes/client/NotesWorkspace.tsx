"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NoteDTO } from "../db/collections";
import { Sidebar } from "./Sidebar";
import { NoteGrid } from "./NoteGrid";
import { NoteDetail, type NoteDraft } from "./NoteDetail";
import { ConfirmDialog } from "./ConfirmDialog";

export type ViewFilter = "all" | "pinned" | "favorites";
type Mode = "preview" | "edit";

const EMPTY_DRAFT: NoteDraft = { title: "", content: "", category: "", tags: [], pinned: false, favorite: false, projectId: "" };

function sortNotes(notes: NoteDTO[]): NoteDTO[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function toDraft(note: NoteDTO): NoteDraft {
  return {
    title: note.title,
    content: note.content,
    category: note.category,
    tags: note.tags,
    pinned: note.pinned,
    favorite: note.favorite,
    projectId: note.projectId ?? "",
  };
}

function draftsEqual(a: NoteDraft, b: NoteDraft): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.category === b.category &&
    a.pinned === b.pinned &&
    a.favorite === b.favorite &&
    (a.projectId ?? "") === (b.projectId ?? "") &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i])
  );
}

export function NotesWorkspace({ initialNotes }: { initialNotes: NoteDTO[] }) {
  const searchParams = useSearchParams();
  // Deep-link support (e.g. from Global Search / Command Palette):
  // ?open=<id> auto-selects that note, ?new=1 opens a blank note in edit mode, on first render.
  const openParam = searchParams.get("open");
  const isNewParam = searchParams.get("new") === "1";
  const deepLinkedNote = openParam ? initialNotes.find((n) => n._id === openParam) : undefined;

  const [notes, setNotes] = useState<NoteDTO[]>(sortNotes(initialNotes));
  const [selectedId, setSelectedId] = useState<string | "new" | null>(
    deepLinkedNote ? deepLinkedNote._id : isNewParam ? "new" : null
  );
  const [draft, setDraft] = useState<NoteDraft>(deepLinkedNote ? toDraft(deepLinkedNote) : EMPTY_DRAFT);
  const [savedSnapshot, setSavedSnapshot] = useState<NoteDraft>(deepLinkedNote ? toDraft(deepLinkedNote) : EMPTY_DRAFT);
  const [mode, setMode] = useState<Mode>(isNewParam && !deepLinkedNote ? "edit" : "preview");
  const [fullView, setFullView] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ViewFilter>("all");
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDirty = selectedId !== null && !draftsEqual(draft, savedSnapshot);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeCategory && n.category !== activeCategory) return false;
      if (activeFilter === "pinned" && !n.pinned) return false;
      if (activeFilter === "favorites" && !n.favorite) return false;
      if (q) {
        const haystack = `${n.title} ${n.content} ${n.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notes, activeCategory, activeFilter, search]);

  function guarded(action: () => void) {
    if (isDirty) {
      setPendingAction(() => action);
    } else {
      action();
    }
  }

  function selectFilter(filter: ViewFilter) {
    if (filter === "all") setActiveCategory(null);
    setActiveFilter(filter);
  }

  function openNote(id: string) {
    const note = notes.find((n) => n._id === id);
    if (!note) return;
    const nextDraft = toDraft(note);
    setSelectedId(id);
    setDraft(nextDraft);
    setSavedSnapshot(nextDraft);
    setMode("preview");
    setFullView(false);
  }

  function startNewNote() {
    setSelectedId("new");
    setDraft(EMPTY_DRAFT);
    setSavedSnapshot(EMPTY_DRAFT);
    setMode("edit");
    setFullView(false);
  }

  function closeNote() {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setSavedSnapshot(EMPTY_DRAFT);
    setMode("preview");
    setFullView(false);
  }

  function discardChanges() {
    setDraft(savedSnapshot);
  }

  function updateDraft(patch: Partial<NoteDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function patchNote(id: string, patch: Partial<NoteDraft>) {
    const res = await fetch(`/api/modules/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated: NoteDTO = await res.json();
    setNotes((prev) => sortNotes(prev.map((n) => (n._id === id ? updated : n))));
    if (selectedId === id) {
      const nextDraft = toDraft(updated);
      setDraft(nextDraft);
      setSavedSnapshot(nextDraft);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (selectedId === "new") {
        const res = await fetch("/api/modules/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const created: NoteDTO = await res.json();
        setNotes((prev) => sortNotes([...prev, created]));
        const nextDraft = toDraft(created);
        setSelectedId(created._id);
        setDraft(nextDraft);
        setSavedSnapshot(nextDraft);
        setMode("preview");
      } else if (selectedId) {
        await patchNote(selectedId, draft);
        setMode("preview");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/modules/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n._id !== id));
    if (selectedId === id) closeNote();
    setDeleteTarget(null);
  }

  function runPending() {
    setPendingAction((current) => {
      current?.();
      return null;
    });
  }

  // Keyboard shortcuts: Esc close, Ctrl+E toggle edit, Ctrl+S save, Ctrl+W close, Ctrl+F focus search.
  // Note: browsers reserve Ctrl+W to close the tab and generally won't let a page override it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (pendingAction || deleteTarget) {
        if (e.key === "Escape") {
          e.preventDefault();
          setPendingAction(null);
          setDeleteTarget(null);
        }
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Escape" && selectedId) {
        e.preventDefault();
        guarded(closeNote);
        return;
      }
      if (mod && e.key.toLowerCase() === "e" && selectedId) {
        e.preventDefault();
        setMode((m) => (m === "edit" ? "preview" : "edit"));
        return;
      }
      if (mod && e.key.toLowerCase() === "s" && selectedId) {
        e.preventDefault();
        if (isDirty) save();
        return;
      }
      if (mod && e.key.toLowerCase() === "w" && selectedId) {
        e.preventDefault();
        guarded(closeNote);
        return;
      }
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isDirty, pendingAction, deleteTarget, draft, savedSnapshot]);

  // Warn on browser refresh / tab close with unsaved changes.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const deleteTargetNote = deleteTarget ? notes.find((n) => n._id === deleteTarget) : null;
  const isFullView = selectedId !== null && fullView;

  return (
    // h-full, not a hardcoded viewport calc — this now correctly fills whatever
    // height `main` (in dashboard/layout.tsx) actually has, on every breakpoint,
    // instead of assuming a specific padding value that only held on desktop.
    <div className="animate-fade-in flex h-full min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
      {/* Sidebar + Grid: hidden on mobile once a note is open (Preview-only there), and hidden at every
          breakpoint while a note is in Full View, since it then takes the whole module width. */}
      <div
        className={`${
          isFullView ? "hidden" : selectedId ? "hidden md:flex" : "flex"
        } flex-1 min-w-0 flex-col md:flex-row min-h-0`}
      >
        <Sidebar
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          activeFilter={activeFilter}
          onSelectFilter={selectFilter}
          onNewNote={() => guarded(startNewNote)}
          onOpenSemanticResult={(id) => guarded(() => openNote(id))}
        />
        <NoteGrid
          notes={filteredNotes}
          selectedId={selectedId === "new" ? null : selectedId}
          onSelect={(id) => guarded(() => openNote(id))}
          onTogglePin={(id) => {
            const note = notes.find((n) => n._id === id);
            if (note) patchNote(id, { pinned: !note.pinned });
          }}
          onToggleFavorite={(id) => {
            const note = notes.find((n) => n._id === id);
            if (note) patchNote(id, { favorite: !note.favorite });
          }}
          onRequestDelete={(id) => setDeleteTarget(id)}
        />
      </div>

      {/* Preview: zero width/opacity until a note is selected, then animates open — the Grid pane above
          resizes in step since it's flex-1 and this is its sibling, so no separate resize logic is needed.
          In Full View it takes the whole module width instead of the fixed 420/460px column. */}
      <div
        className={`flex shrink-0 overflow-hidden border-border transition-all duration-200 ease-out ${
          !selectedId
            ? "w-0 border-l-0 opacity-0"
            : isFullView
              ? "w-full border-l-0 opacity-100"
              : "w-full opacity-100 md:w-[420px] md:border-l lg:w-[460px]"
        }`}
      >
        {selectedId && (
          <NoteDetail
            key={`${selectedId}-${mode}`}
            noteId={selectedId === "new" ? null : selectedId}
            draft={draft}
            isNew={selectedId === "new"}
            mode={mode}
            saving={saving}
            fullView={isFullView}
            summary={selectedId === "new" ? undefined : notes.find((n) => n._id === selectedId)?.summary}
            summaryGeneratedAt={selectedId === "new" ? undefined : notes.find((n) => n._id === selectedId)?.summaryGeneratedAt}
            onChange={updateDraft}
            onEnterEdit={() => setMode("edit")}
            onSave={save}
            onClose={() => guarded(closeNote)}
            onRequestDelete={() => selectedId !== "new" && setDeleteTarget(selectedId)}
            onToggleFullView={() => setFullView((v) => !v)}
            onOpenNote={(id) => guarded(() => openNote(id))}
            onSummaryGenerated={(summary, summaryGeneratedAt) => {
              setNotes((prev) => prev.map((n) => (n._id === selectedId ? { ...n, summary, summaryGeneratedAt } : n)));
            }}
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title="Unsaved Changes"
        description="You have unsaved changes. Save before leaving?"
        onDismiss={() => setPendingAction(null)}
        actions={[
          {
            label: "Save",
            tone: "primary",
            onClick: async () => {
              await save();
              runPending();
            },
          },
          {
            label: "Discard",
            tone: "danger",
            onClick: () => {
              discardChanges();
              runPending();
            },
          },
          { label: "Cancel", tone: "default", onClick: () => setPendingAction(null) },
        ]}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Note?"
        description={`${deleteTargetNote?.title || "This note"} — this action cannot be undone.`}
        onDismiss={() => setDeleteTarget(null)}
        actions={[
          { label: "Delete", tone: "danger", onClick: () => deleteTarget && deleteNote(deleteTarget) },
          { label: "Cancel", tone: "default", onClick: () => setDeleteTarget(null) },
        ]}
      />
    </div>
  );
}
