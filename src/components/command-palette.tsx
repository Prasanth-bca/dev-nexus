"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowUpRight, FileText, FolderKanban, LogOut, MessageSquarePlus, Moon, Search, Sun } from "lucide-react";
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

/**
 * Command Palette (Ctrl+K) — quick nav + quick actions + search everything, all in one dialog.
 * This is the same dialog/API that powered Global Search (Priority 2): shadcn's Command
 * primitive with `shouldFilter={false}` since /api/search already returns filtered/ranked
 * results server-side. What's new here is the global Ctrl+K shortcut and the Quick Actions
 * group — actions that *do* something (new note, new chat, toggle theme, log out), not just
 * navigate.
 */
export function CommandPalette({ collapsed = false }: { collapsed?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

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

  function close() {
    setOpen(false);
    setQuery("");
  }

  function select(result: SearchResult) {
    close();
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

  return (
    <>
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

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Palette"
        description="Search, navigate, and run quick actions"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or run a command…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!loading && query.trim() && results.length === 0 && filteredActions.length === 0 && (
              <CommandEmpty>No results for &quot;{query}&quot;.</CommandEmpty>
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
                    <CommandItem
                      key={r.id}
                      value={r.id}
                      onSelect={() => select(r)}
                      style={{ "--accent": accent } as React.CSSProperties}
                    >
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
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
