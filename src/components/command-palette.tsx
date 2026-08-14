"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command as CommandPrimitive } from "cmdk";
import { ArrowUpRight, FileText, FolderKanban, History, LogOut, MessageSquarePlus, Moon, Search, Sun, X } from "lucide-react";
import { getModuleAccent } from "@/lib/icon-map";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  external?: boolean;
  group: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
}

/**
 * /api/search groups results by the module's *display name*, so map those back to
 * module ids to pick up each one's accent. "Go to" (nav/static destinations) has no
 * owning module and falls through to the primary colour.
 */
const GROUP_MODULE_IDS: Record<string, string> = {
  Notes: "notes",
  "AI Assistant": "ai-assistant",
  Gmail: "gmail",
  GitHub: "github",
  "File Vault": "file-vault",
  Activity: "activity",
  Projects: "projects",
};

function groupAccent(group: string): string {
  return getModuleAccent(GROUP_MODULE_IDS[group]);
}

const RECENT_SEARCHES_KEY = "devnexus.recentSearches";
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): SearchResult[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecentSearch(result: SearchResult) {
  try {
    const existing = loadRecentSearches().filter((r) => r.id !== result.id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([result, ...existing].slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Storage unavailable (private browsing, quota) — recent searches just won't persist.
  }
}

/**
 * Command Palette (Ctrl+K) — quick nav + quick actions + search everything. `variant`
 * changes only the trigger and container, never the fetch/keyboard/recent-searches logic:
 *  - "sidebar"/"icon": a small trigger that opens the search UI in a `CommandDialog` (modal).
 *  - "hero": the dashboard homepage's dominant search bar. This one does NOT use a modal —
 *    per the redesign, it behaves like Google's homepage search: the pill IS the real input,
 *    and results expand directly underneath it in normal document flow (pushing page content
 *    down), never as a popup/overlay/backdrop. Closed by Escape, clicking outside, or clearing
 *    + blurring — see the click-outside effect and the "hero" render branch below.
 */
export function CommandPalette({
  collapsed = false,
  variant = "sidebar",
}: { collapsed?: boolean; variant?: "sidebar" | "hero" | "icon" } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => setRecentSearches(loadRecentSearches()), 0);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const delay = query.trim() ? 300 : 0;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setLoading(false));
    }, delay);
    return () => clearTimeout(timeout);
  }, [query, open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The hero variant has no modal/backdrop to catch outside clicks or Escape for it, so it
  // needs its own — click anywhere outside the pill+panel, or press Escape, and the panel
  // collapses. Only setOpen (not close()) — matching how the modal variant's own
  // Escape/backdrop-dismiss already behaves — so a query the user typed survives a dismiss
  // and only actually clears via the explicit clear button or picking a result.
  useEffect(() => {
    if (variant !== "hero" || !open) return;
    function onPointerDown(e: PointerEvent) {
      if (heroContainerRef.current && !heroContainerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        heroInputRef.current?.blur();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [variant, open]);

  useEffect(() => {
    if (variant === "hero" && open) heroInputRef.current?.focus();
  }, [variant, open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function select(result: SearchResult) {
    close();
    pushRecentSearch(result);
    if (result.external) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      router.push(result.url);
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: "new-project",
      label: "Create Project",
      icon: FolderKanban,
      run: () => {
        close();
        router.push("/dashboard/projects?new=1");
      },
    },
    {
      id: "new-note",
      label: "New Note",
      icon: FileText,
      run: () => {
        close();
        router.push("/dashboard/notes?new=1");
      },
    },
    {
      id: "new-chat",
      label: "New AI Chat",
      icon: MessageSquarePlus,
      run: () => {
        close();
        router.push("/dashboard/ai-assistant?new=1");
      },
    },
    {
      id: "toggle-theme",
      label: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      run: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        close();
      },
    },
    {
      id: "logout",
      label: "Log Out",
      icon: LogOut,
      run: () => {
        close();
        fetch("/api/auth/logout", { method: "POST" }).then(() => {
          router.push("/login");
          router.refresh();
        });
      },
    },
  ];

  const filteredActions = quickActions.filter((a) => !query.trim() || a.label.toLowerCase().includes(query.toLowerCase()));

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  // Shared between the modal (sidebar/icon) and inline (hero) renderings — same groups,
  // same data, just a different container around them.
  const resultGroups = (
    <>
      {!loading && query.trim() && results.length === 0 && filteredActions.length === 0 && (
        <CommandEmpty>No results for &quot;{query}&quot;.</CommandEmpty>
      )}

      {!query.trim() && recentSearches.length > 0 && (
        <CommandGroup heading="Recent Searches">
          {recentSearches.map((r) => (
            <CommandItem key={`recent-${r.id}`} value={`recent-${r.id}`} onSelect={() => select(r)}>
              <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{r.title}</span>
                {r.description && <span className="truncate text-xs text-muted-foreground">{r.description}</span>}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {filteredActions.length > 0 && (
        <CommandGroup heading="Quick Actions">
          {filteredActions.map((a) => (
            <CommandItem key={a.id} value={a.id} onSelect={a.run}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-foreground/[0.04] dark:bg-white/[0.05]">
                <a.icon className="h-3.5 w-3.5" />
              </span>
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {Object.entries(grouped).map(([group, items]) => {
        const accent = groupAccent(group);
        return (
          <CommandGroup key={group} heading={group}>
            {items.map((r) => (
              <CommandItem key={r.id} value={r.id} onSelect={() => select(r)} style={{ "--accent": accent } as React.CSSProperties}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{r.title}</span>
                  {r.description && <span className="truncate text-xs text-muted-foreground">{r.description}</span>}
                </div>
                {r.external && <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />}
              </CommandItem>
            ))}
          </CommandGroup>
        );
      })}
    </>
  );

  if (variant === "hero") {
    return (
      <div ref={heroContainerRef} className="relative mx-auto w-full max-w-[720px]">
        <Command shouldFilter={false} className="size-auto overflow-visible rounded-none bg-transparent p-0">
          <div className="glass focus-glow flex items-center gap-3 rounded-full px-5 py-4 transition-colors">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              ref={heroInputRef}
              value={query}
              onValueChange={(v) => {
                setQuery(v);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search Dev Nexus…"
              aria-label="Search Dev Nexus"
              className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  close();
                  heroInputRef.current?.blur();
                }}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="shrink-0 rounded-md border border-border/60 bg-foreground/[0.04] px-2 py-1 font-mono text-[11px] dark:bg-white/[0.06]">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Expands directly underneath the pill, in normal document flow — the rest of the
              homepage is pushed down by this, not covered by it. No portal, no backdrop. */}
          {open && (
            <div className="animate-fade-in-up glass-strong mt-3 overflow-hidden rounded-2xl p-2 text-left">
              <CommandList className="max-h-[60vh]">{resultGroups}</CommandList>
            </div>
          )}
        </Command>
      </div>
    );
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search Dev Nexus"
          title="Search (⌘K)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          className={`h-8 w-full font-normal text-muted-foreground ${collapsed ? "justify-center px-0" : "justify-start gap-2"}`}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              Search…
              <kbd className="ml-auto rounded border border-border/60 bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/[0.06]">
                ⌘K
              </kbd>
            </>
          )}
        </Button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Palette"
        description="Search, navigate, and run quick actions"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or run a command…" value={query} onValueChange={setQuery} />
          <CommandList>{resultGroups}</CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
