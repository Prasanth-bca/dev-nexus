"use client";

import { useState, type FormEvent } from "react";
import { CheckCheck, Mail, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { EmailDetail as EmailDetailType } from "./types";

export function MessageDetail({
  email,
  loading,
  onClose,
  onMarkedRead,
}: {
  email: EmailDetailType | null;
  loading: boolean;
  onClose?: () => void;
  onMarkedRead: (id: string) => void;
}) {
  const [labeling, setLabeling] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [marking, setMarking] = useState(false);

  async function handleMarkRead() {
    if (!email) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/modules/gmail/messages/${email.id}/read`, { method: "POST" });
      if (!res.ok) {
        toast.error("Could not mark as read.");
        return;
      }
      onMarkedRead(email.id);
    } finally {
      setMarking(false);
    }
  }

  async function handleAddLabel(e: FormEvent) {
    e.preventDefault();
    if (!email || !labelInput.trim()) return;
    const label = labelInput.trim();
    try {
      const res = await fetch(`/api/modules/gmail/messages/${email.id}/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not add label.");
        return;
      }
      toast.success(`Labeled "${label}"`);
      setLabelInput("");
      setLabeling(false);
    } catch {
      toast.error("Could not add label.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!email) {
    return <EmptyState icon={Mail} title="Select an email" description="Choose a message from the list to read it here." />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold break-words">{email.subject || "(no subject)"}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            From: <span className="text-foreground">{email.from}</span>
          </p>
          {email.to && <p className="truncate text-xs text-muted-foreground">To: {email.to}</p>}
          <p className="text-xs text-muted-foreground">{email.date}</p>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b p-3">
        {email.unread && (
          <Button type="button" variant="outline" size="sm" onClick={handleMarkRead} disabled={marking} className="h-7 gap-1 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark as read
          </Button>
        )}
        {labeling ? (
          <form onSubmit={handleAddLabel} className="flex items-center gap-1">
            <input
              autoFocus
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onBlur={() => !labelInput && setLabeling(false)}
              placeholder="Label name"
              className="h-7 rounded-md border bg-transparent px-2 text-xs outline-none focus:border-ring"
            />
            <Button type="submit" size="sm" className="h-7 text-xs">
              Add
            </Button>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setLabeling(true)} className="h-7 gap-1 text-xs">
            <Tag className="h-3.5 w-3.5" />
            Add label
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{email.body}</p>
      </div>
    </div>
  );
}
