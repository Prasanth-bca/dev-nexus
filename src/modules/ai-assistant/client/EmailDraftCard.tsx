"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail, RotateCcw, Save, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getModuleAccent } from "@/lib/icon-map";

const ACCENT = getModuleAccent("ai-assistant");

// Deliberately duplicated (not imported) from src/lib/integrations/gmail.ts — that file pulls
// in Node-only secret/crypto access via getSecret() and can't be imported into a client component.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailList(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .every((s) => s.length > 0 && EMAIL_RE.test(s));
}

export interface EmailDraftFields {
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  body?: unknown;
  sent?: unknown;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function EmailDraftCard({
  conversationId,
  toolCallId,
  initial,
  regenerateDisabled,
  onDiscard,
  onRegenerate,
}: {
  conversationId: string;
  toolCallId: string;
  initial: EmailDraftFields;
  /** True while a chat turn is already in flight elsewhere in the transcript — blocks Regenerate, not editing/saving/sending. */
  regenerateDisabled?: boolean;
  onDiscard: () => void;
  /** Sends a follow-up chat message asking the AI to revise this draft — reuses the normal chat pipeline in ChatView. */
  onRegenerate: (instruction: string) => void;
}) {
  const [to, setTo] = useState(str(initial.to));
  const [cc, setCc] = useState(str(initial.cc));
  const [bcc, setBcc] = useState(str(initial.bcc));
  const [subject, setSubject] = useState(str(initial.subject));
  const [body, setBody] = useState(str(initial.body));
  const [sent, setSent] = useState(initial.sent === true);
  const [showCcBcc, setShowCcBcc] = useState(Boolean(str(initial.cc) || str(initial.bcc)));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  // The initial useState()s above only seed on first mount. Without this, switching to a
  // different conversation whose draft_email tool call happens to render at the same list
  // position kept showing the previous conversation's draft text while pointing at the new
  // tool call — risking Save/Send acting on mismatched content. toolCallId uniquely identifies
  // which draft this card represents, so resync whenever it changes to a different one.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTo(str(initial.to));
      setCc(str(initial.cc));
      setBcc(str(initial.bcc));
      setSubject(str(initial.subject));
      setBody(str(initial.body));
      setSent(initial.sent === true);
      setShowCcBcc(Boolean(str(initial.cc) || str(initial.bcc)));
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolCallId]);

  const toValid = to.trim().length > 0 && isValidEmailList(to);
  const ccValid = isValidEmailList(cc);
  const bccValid = isValidEmailList(bcc);
  const canSend = toValid && ccValid && bccValid && subject.trim().length > 0 && body.trim().length > 0;

  async function persist(patch: Record<string, string | boolean>): Promise<boolean> {
    const res = await fetch(`/api/modules/ai-assistant/conversations/${conversationId}/draft/${toolCallId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ok = await persist({ to, cc, bcc, subject, body });
      if (ok) toast.success("Draft saved.");
      else toast.error("Could not save the draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/modules/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, bcc, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not send email.");
        return;
      }
      setSent(true);
      void persist({ to, cc, bcc, subject, body, sent: true });
      toast.success(`Sent to ${to}.`);
    } finally {
      setSending(false);
    }
  }

  function submitRegenerate() {
    const text = instruction.trim() || "Please revise this draft.";
    setRegenerateOpen(false);
    setInstruction("");
    onRegenerate(text);
  }

  return (
    <div
      style={{ "--accent": ACCENT } as React.CSSProperties}
      className="animate-fade-in-up min-w-0 max-w-[65ch] flex-1 rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] p-3.5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email draft</span>
        {sent && (
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </span>
        )}
      </div>

      <fieldset disabled={sent || sending} className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${toolCallId}-to`} className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id={`${toolCallId}-to`}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
            aria-invalid={to.trim().length > 0 && !toValid}
            className="h-9 text-sm"
          />
          {to.trim().length > 0 && !toValid && <p className="text-[11px] text-destructive">Enter one or more valid email addresses, comma-separated.</p>}
        </div>

        {showCcBcc ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${toolCallId}-cc`} className="text-xs text-muted-foreground">
                Cc
              </Label>
              <Input
                id={`${toolCallId}-cc`}
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Optional"
                aria-invalid={!ccValid}
                className="h-9 text-sm"
              />
              {!ccValid && <p className="text-[11px] text-destructive">Enter one or more valid email addresses, comma-separated.</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${toolCallId}-bcc`} className="text-xs text-muted-foreground">
                Bcc
              </Label>
              <Input
                id={`${toolCallId}-bcc`}
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Optional"
                aria-invalid={!bccValid}
                className="h-9 text-sm"
              />
              {!bccValid && <p className="text-[11px] text-destructive">Enter one or more valid email addresses, comma-separated.</p>}
            </div>
          </>
        ) : (
          !sent && (
            <button
              type="button"
              onClick={() => setShowCcBcc(true)}
              className="flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <UserPlus className="h-3 w-3" />
              Add Cc/Bcc
            </button>
          )
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${toolCallId}-subject`} className="text-xs text-muted-foreground">
            Subject
          </Label>
          <Input id={`${toolCallId}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${toolCallId}-body`} className="text-xs text-muted-foreground">
            Body
          </Label>
          <Textarea
            id={`${toolCallId}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="resize-y text-sm leading-relaxed"
          />
        </div>
      </fieldset>

      {!sent && (
        <>
          {regenerateOpen && (
            <div className="animate-fade-in mt-3 flex items-center gap-1.5">
              <Input
                autoFocus
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRegenerate();
                  }
                }}
                placeholder="e.g. make it more professional, add a polite closing…"
                disabled={regenerateDisabled}
                className="h-8 flex-1 text-xs"
              />
              <Button type="button" size="sm" onClick={submitRegenerate} disabled={regenerateDisabled} className="h-8">
                Ask AI
              </Button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <Button type="button" size="sm" onClick={() => setConfirmOpen(true)} disabled={!canSend || sending} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRegenerateOpen((v) => !v)}
              disabled={regenerateDisabled}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              className="ml-auto gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this email?"
        description={`This will send it to ${to}${cc.trim() ? ` (cc: ${cc.trim()})` : ""}${bcc.trim() ? ` (bcc: ${bcc.trim()})` : ""} right away.`}
        confirmLabel="Send"
        onConfirm={handleSend}
      />
    </div>
  );
}
