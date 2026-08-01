"use client";

import type { RefObject } from "react";
import { Plus, Search, Star, Pin, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "../constants";
import type { ViewFilter } from "./NotesWorkspace";
import { SemanticSearchDialog } from "./SemanticSearchDialog";

const ACCENT = "var(--module-notes)";

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
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all duration-200",
        active
          ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0"
        )}
      />
      {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-[var(--accent)]")} />}
      <span className="truncate">{children}</span>
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
    <aside
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className="flex w-full flex-col gap-4 overflow-y-auto border-b border-border p-3 md:w-56 md:shrink-0 md:border-r md:border-b-0"
    >
      <Button type="button" onClick={onNewNote} className="w-full gap-1.5">
        <Plus className="h-4 w-4" />
        New Note
      </Button>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes by keyword"
            className="pl-8 text-sm"
          />
        </div>
        <SemanticSearchDialog onSelect={onOpenSemanticResult} />
      </div>

      <div className="flex flex-col gap-0.5">
        <NavButton active={activeFilter === "all" && !activeCategory} onClick={() => onSelectFilter("all")} icon={Files}>
          All Notes
        </NavButton>
        <NavButton active={activeFilter === "pinned"} onClick={() => onSelectFilter("pinned")} icon={Pin}>
          Pinned
        </NavButton>
        <NavButton active={activeFilter === "favorites"} onClick={() => onSelectFilter("favorites")} icon={Star}>
          Favorites
        </NavButton>
      </div>

      <div>
        <div className="mb-1 px-2.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Categories</div>
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
