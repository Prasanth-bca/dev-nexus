"use client";

import type { RefObject } from "react";
import { CATEGORIES } from "../constants";
import type { ViewFilter } from "./NotesWorkspace";
import { SemanticSearchDialog } from "./SemanticSearchDialog";

interface SidebarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  activeFilter: ViewFilter;
  onSelectFilter: (filter: ViewFilter) => void;
  onNewNote: () => void;
  onOpenSemanticResult: (id: string) => void;
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  search,
  onSearchChange,
  searchInputRef,
  activeCategory,
  onSelectCategory,
  activeFilter,
  onSelectFilter,
  onNewNote,
  onOpenSemanticResult,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 p-3 overflow-y-auto">
      <button
        type="button"
        onClick={onNewNote}
        className="w-full rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium py-2"
      >
        + New Note
      </button>

      <input
        ref={searchInputRef}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search notes… (Ctrl+F)"
        className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
      />

      <SemanticSearchDialog onSelect={onOpenSemanticResult} />

      <div className="flex flex-col gap-0.5">
        <NavButton active={activeFilter === "all" && !activeCategory} onClick={() => onSelectFilter("all")}>
          All Notes
        </NavButton>
        <NavButton active={activeFilter === "pinned"} onClick={() => onSelectFilter("pinned")}>
          Pinned
        </NavButton>
        <NavButton active={activeFilter === "favorites"} onClick={() => onSelectFilter("favorites")}>
          Favorites
        </NavButton>
      </div>

      <div>
        <div className="px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Categories</div>
        <div className="flex flex-col gap-0.5">
          {CATEGORIES.map((category) => (
            <NavButton
              key={category}
              active={activeCategory === category}
              onClick={() => onSelectCategory(activeCategory === category ? null : category)}
            >
              {category}
            </NavButton>
          ))}
        </div>
      </div>
    </aside>
  );
}
