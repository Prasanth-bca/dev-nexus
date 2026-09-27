"use client";

import { useState, type FormEvent } from "react";
import { CheckCheck, ChevronDown, Mail, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import type { EmailDetail as EmailDetailType } from "./types";

const ACCENT = getModuleAccent("gmail");

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
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="mt-3 h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <EmptyState
          icon={Mail}
          accent={ACCENT}
          title="Select an email"
          description="Choose a message from the list to read it here."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex h-full min-h-0 flex-col" style={{ "--accent": ACCENT } as React.CSSProperties}>
      <div className="border-b border-border">
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            {email.unread && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Unread
              </span>
            )}
            <h2 className="text-base leading-snug font-semibold break-words">{email.subject || "(no subject)"}</h2>
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              {detailsOpen ? "Hide details" : "Show details"}
            </button>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close message"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {detailsOpen && (
          <div className="px-5 pb-3 space-y-1 text-sm border-t border-border/50 pt-2 bg-foreground/[0.02] dark:bg-white/[0.02]">
            <p className="truncate text-muted-foreground">
              From: <span className="font-medium text-foreground">{email.from}</span>
            </p>
            {email.to && <p className="truncate text-muted-foreground">To: <span className="text-foreground">{email.to}</span></p>}
            <p className="text-xs text-muted-foreground/80">{email.date}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-foreground/[0.02] px-5 py-2.5 dark:bg-white/[0.02]">
        {email.unread && (
          <Button type="button" variant="outline" size="sm" onClick={handleMarkRead} disabled={marking} className="gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark as read
          </Button>
        )}
        {labeling ? (
          <form onSubmit={handleAddLabel} className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onBlur={() => !labelInput && setLabeling(false)}
              placeholder="Label name"
              aria-label="Label name"
              className="h-7 w-40 text-xs"
            />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setLabeling(true)} className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Add label
          </Button>
        )}
      </div>

      {/* Reading surface — centered, measure-capped for legibility. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex justify-center">
        {email.bodyHtml ? (
          <div
            className="w-full max-w-3xl text-sm leading-relaxed prose prose-sm dark:prose-invert prose-a:text-[var(--accent)]"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : (
          <p className="w-full max-w-3xl text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{email.body}</p>
        )}
      </div>
    </div>
  );
}
