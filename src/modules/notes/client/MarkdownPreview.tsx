"use client";

import "highlight.js/styles/github-dark.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="px-1 py-1 prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content || "*Nothing to preview yet.*"}
      </ReactMarkdown>
    </div>
  );
}
