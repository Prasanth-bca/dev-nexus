"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SummaryPanel({
  noteId,
  content,
  summary,
  onGenerated,
}: {
  noteId: string;
  content: string;
  summary?: string;
  summaryGeneratedAt?: string;
  onGenerated: (summary: string, generatedAt: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!content.trim()) {
      toast.error("Add some content before generating a summary.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/modules/notes/${noteId}/summarize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not generate a summary.");
        return;
      }
      onGenerated(data.summary, data.summaryGeneratedAt);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={generate} className="h-7 w-fit gap-1 text-xs">
        <Sparkles className="h-3.5 w-3.5" />
        Summarize
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">AI Summary</span>
        <Button type="button" variant="ghost" size="sm" onClick={generate} className="h-6 gap-1 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </Button>
      </div>
      <p className="text-sm">{summary}</p>
    </div>
  );
}
