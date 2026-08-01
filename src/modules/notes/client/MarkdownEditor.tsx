"use client";

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write in Markdown…"
      className="flex-1 min-h-0 resize-none px-3 py-2 font-mono text-sm bg-transparent outline-none border border-zinc-200 dark:border-zinc-800 rounded-lg"
    />
  );
}
