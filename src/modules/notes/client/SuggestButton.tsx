"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SuggestButton({
  noteId,
  onApply,
}: {
  noteId: string;
  onApply: (suggestion: { category: string; tags: string[] }) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/modules/notes/${noteId}/suggest`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not generate a suggestion.");
        return;
      }
      onApply(data);
      toast.success("Category and tags suggested — review before saving.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={loading} className="h-7 gap-1 text-xs">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Suggest
    </Button>
  );
}
