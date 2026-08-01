"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface SemanticResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

/** "AI Search" — meaning-based search over notes via local on-device embeddings, a separate mode
 * from the Sidebar's plain keyword filter. Reuses the same Command/CommandDialog primitives as
 * Global Search and the Command Palette, but with its own data source and its own dialog. */
export function SemanticSearchDialog({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (!open || !hasQuery) return;
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/modules/notes/semantic-search?q=${encodeURIComponent(query)}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Semantic search failed.");
            setResults([]);
            return;
          }
          setResults(Array.isArray(data) ? data : []);
        })
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, open, hasQuery]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }

  function select(id: string) {
    handleOpenChange(false);
    onSelect(id);
  }

  function reindex() {
    setReindexing(true);
    fetch("/api/modules/notes/reindex-embeddings", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.processed > 0) {
          toast.success(`Indexed ${data.processed} note${data.processed === 1 ? "" : "s"} for AI Search.`);
        } else if (data.failed > 0) {
          toast.error(`Could not index ${data.failed} note${data.failed === 1 ? "" : "s"}.`);
        } else {
          toast.info("All notes are already indexed.");
        }
      })
      .finally(() => setReindexing(false));
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        style={{ "--accent": "var(--module-notes)" } as React.CSSProperties}
        className="w-full gap-1.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:text-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
        AI Search
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Semantic Search"
        description="Search notes by meaning, not just keywords"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Describe what you're looking for…" value={query} onValueChange={setQuery} />
          <CommandList>
            {hasQuery && error ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{error}</div>
            ) : (
              <>
                {hasQuery && !loading && results.length === 0 && (
                  <CommandEmpty>No matches. If this note predates AI Search, try reindexing below.</CommandEmpty>
                )}
                {hasQuery && results.length > 0 && (
                  <CommandGroup heading="Notes">
                    {results.map((r) => (
                      <CommandItem key={r.id} value={r.id} onSelect={() => select(r.id)}>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{r.title}</span>
                          <span className="truncate text-xs text-muted-foreground">{r.snippet}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
          <div className="flex items-center justify-between border-t px-2 py-1.5">
            <span className="text-[11px] text-muted-foreground">Runs on-device — no cloud, nothing to install</span>
            <Button type="button" variant="ghost" size="sm" onClick={reindex} disabled={reindexing} className="h-6 text-xs">
              {reindexing ? "Indexing…" : "Reindex notes"}
            </Button>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
