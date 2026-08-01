"use client";

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    // Solid surface, never .glass — this is a writing surface where crisp text
    // matters more than depth, and a blurred backdrop behind a caret reads badly.
    <div className="focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200">
      <div className="flex items-center gap-2 border-b border-border bg-foreground/[0.03] px-3 py-1.5 dark:bg-white/[0.03]">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Markdown</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{value.length.toLocaleString()} chars</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write in Markdown…"
        aria-label="Note content in Markdown"
        spellCheck={false}
        className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
