"use client";

import "highlight.js/styles/github-dark.css";
import { useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { isValidElement } from "react";

/** Pulls "ts" out of rehype-highlight's `language-ts` class on the inner <code>. */
function languageOf(children: ReactNode): string | null {
  if (!isValidElement<{ className?: string }>(children)) return null;
  const match = /language-([\w-]+)/.exec(children.props.className ?? "");
  return match ? match[1] : null;
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const language = languageOf(children);

  function copy() {
    // Read the rendered text rather than reconstructing it from the AST — that way
    // what gets copied is exactly what's on screen, highlighting spans and all.
    const text = preRef.current?.textContent ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="group/code relative my-4 overflow-hidden rounded-xl border border-border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-1.5">
        <span className="font-mono text-[11px] tracking-wide text-slate-400 uppercase">{language ?? "code"}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover/code:opacity-100"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre ref={preRef} className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    // Reading surface: solid, never blurred. Prose tokens are wired to the design
    // system so headings/links/tables follow the theme in both light and dark.
    <div
      className="prose prose-sm dark:prose-invert max-w-none px-1 py-1
        prose-headings:tracking-tight prose-headings:font-semibold
        prose-a:text-[color:var(--primary)] prose-a:no-underline hover:prose-a:underline
        prose-code:rounded prose-code:bg-foreground/[0.06] prose-code:px-1 prose-code:py-0.5
        prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        dark:prose-code:bg-white/[0.08]
        prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0
        prose-blockquote:border-l-2 prose-blockquote:border-[color:var(--primary)]
        prose-blockquote:not-italic prose-blockquote:text-muted-foreground
        prose-hr:border-border
        prose-th:border-border prose-td:border-border
        prose-img:rounded-lg prose-img:border prose-img:border-border"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Overriding `pre` (not `code`) is what distinguishes fenced blocks from
          // inline code — react-markdown v10 dropped the `inline` prop on `code`.
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        }}
      >
        {content || "*Nothing to preview yet.*"}
      </ReactMarkdown>
    </div>
  );
}
