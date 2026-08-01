"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FileText, LogOut, MessageSquarePlus, Moon, Search, Sun } from "lucide-react";
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
 * Command Palette (Ctrl+K) — quick nav + quick actions + search everything, all in one dialog.
 * This is the same dialog/API that powered Global Search (Priority 2): shadcn's Command
 * primitive with `shouldFilter={false}` since /api/search already returns filtered/ranked
 * results server-side. What's new here is the global Ctrl+K shortcut and the Quick Actions
 * group — actions that *do* something (new note, new chat, toggle theme, log out), not just
 * navigate.
 */
export function CommandPalette() {
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
        className="w-full justify-start gap-2 text-muted-foreground font-normal h-8"
      >
        <Search className="h-3.5 w-3.5" />
        Search…
        <kbd className="ml-auto text-[10px] border rounded px-1 py-0.5">Ctrl+K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search, navigate, and run quick actions">
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
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {Object.entries(grouped).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((r) => (
                  <CommandItem key={r.id} value={r.id} onSelect={() => select(r)}>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{r.title}</span>
                      {r.description && <span className="truncate text-xs text-muted-foreground">{r.description}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
