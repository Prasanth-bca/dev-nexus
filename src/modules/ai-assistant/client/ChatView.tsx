"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, MessageSquare, Pencil, Plug, Plus, Send, ShieldAlert, Sparkles, Trash2, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { EmailDraftCard } from "./EmailDraftCard";

const ACCENT = getModuleAccent("ai-assistant");

interface Message {
  role: "user" | "assistant" | "assistant_tool_call" | "tool_result";
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
}

interface PendingConfirmation {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

function pendingFromMessages(messages: Message[]): PendingConfirmation | null {
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant_tool_call" && last.toolCallId) {
    return { id: last.toolCallId, name: last.toolName ?? "", arguments: last.toolArguments ?? {} };
  }
  return null;
}

/** Accent-tinted identity chip that anchors every assistant-side row in the transcript. */
function AssistantAvatar() {
  return (
    <div
      aria-hidden
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
    >
      <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
    </div>
  );
}

function MessageBubble({
  message,
  conversationId,
  regenerateDisabled,
  discarded,
  onDiscardDraft,
  onRegenerateDraft,
}: {
  message: Message;
  conversationId: string | null;
  regenerateDisabled: boolean;
  discarded: boolean;
  onDiscardDraft: (toolCallId: string) => void;
  onRegenerateDraft: (instruction: string) => void;
}) {
  if (message.role === "assistant_tool_call" && message.toolName === "draft_email" && message.toolCallId && conversationId) {
    // An editable form, not a machine-action card — drafting has no outbound effect, so this
    // renders as something to work with rather than something to approve.
    if (discarded) return null;
    return (
      <div className="animate-fade-in-up flex w-full items-start gap-2.5">
        <div aria-hidden className="w-7 shrink-0" />
        <EmailDraftCard
          conversationId={conversationId}
          toolCallId={message.toolCallId}
          initial={message.toolArguments ?? {}}
          regenerateDisabled={regenerateDisabled}
          onDiscard={() => onDiscardDraft(message.toolCallId!)}
          onRegenerate={onRegenerateDraft}
        />
      </div>
    );
  }
  if (message.role === "assistant_tool_call") {
    // Tool activity reads as a machine action, not prose — give it its own bordered
    // card so it never gets mistaken for something the assistant "said".
    const args = message.toolArguments && Object.keys(message.toolArguments).length > 0 ? JSON.stringify(message.toolArguments, null, 2) : null;
    return (
      <div className="animate-fade-in-up flex w-full items-start gap-2.5">
        <div aria-hidden className="w-7 shrink-0" />
        <div className="min-w-0 max-w-[65ch] flex-1 rounded-xl border border-border bg-foreground/[0.04] px-3 py-2.5 dark:bg-white/[0.05]">
          <div className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs font-medium">{message.toolName}</span>
            <span className="ml-auto shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase">Tool call</span>
          </div>
          {args && (
            <details className="group/args mt-2">
              <summary className="cursor-pointer list-none text-[11px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="group-open/args:hidden">Show arguments</span>
                <span className="hidden group-open/args:inline">Hide arguments</span>
              </summary>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-background/60 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {args}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
  if (message.role === "tool_result") {
    return null; // keep raw tool output out of the transcript — the call above and final answer below are enough
  }
  if (message.role === "user") {
    return (
      <div className="animate-fade-in-up flex w-full justify-end">
        <div className="max-w-[min(85%,52ch)] rounded-2xl rounded-br-md border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in-up flex w-full items-start gap-2.5">
      <AssistantAvatar />
      <div className="min-w-0 max-w-[65ch] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

/** Three-dot pulse shown while the model is composing a reply. */
function TypingIndicator() {
  return (
    <div className="animate-fade-in flex w-full items-start gap-2.5">
      <AssistantAvatar />
      <div
        role="status"
        aria-label="Assistant is thinking"
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3.5"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animation: "pulse-dot 1.2s ease-in-out infinite", animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatView({
  hasActiveProvider,
  onNeedProviders,
}: {
  hasActiveProvider: boolean;
  onNeedProviders: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [discardedDrafts, setDiscardedDrafts] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  async function refreshConversations() {
    const res = await fetch("/api/modules/ai-assistant/conversations");
    setConversations(await res.json());
  }

  useEffect(() => {
    fetch("/api/modules/ai-assistant/conversations")
      .then((res) => res.json())
      .then(setConversations);
  }, []);

  // Deep-link support (e.g. from Global Search / Command Palette):
  // ?conversation=<id> opens that conversation, ?new=1 starts a fresh one, on load.
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      fetch(`/api/modules/ai-assistant/conversations/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          const loaded: Message[] = data.messages ?? [];
          setActiveId(conversationId);
          setMessages(loaded);
          setPending(pendingFromMessages(loaded));
        });
      return;
    }

    if (searchParams.get("new") === "1") {
      fetch("/api/modules/ai-assistant/conversations", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          setConversations((prev) => [{ id: data.id, title: data.title, updatedAt: data.updatedAt }, ...prev]);
          setActiveId(data.id);
          setMessages([]);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    setActiveId(id);
    setLoadingConvo(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/ai-assistant/conversations/${id}`);
      const data = await res.json();
      const loaded: Message[] = data.messages ?? [];
      setMessages(loaded);
      setPending(pendingFromMessages(loaded));
    } finally {
      setLoadingConvo(false);
    }
  }

  async function newConversation() {
    const res = await fetch("/api/modules/ai-assistant/conversations", { method: "POST" });
    const data = await res.json();
    setConversations((prev) => [{ id: data.id, title: data.title, updatedAt: data.updatedAt }, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    setPending(null);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/modules/ai-assistant/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
      setPending(null);
    }
  }

  function startRename(c: ConversationSummary) {
    setEditingId(c.id);
    setEditingTitle(c.title);
  }

  async function commitRename() {
    const id = editingId;
    const title = editingTitle.trim();
    setEditingId(null);
    if (!id || !title) return;

    const prevTitle = conversations.find((c) => c.id === id)?.title;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));

    const res = await fetch(`/api/modules/ai-assistant/conversations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok && prevTitle !== undefined) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: prevTitle } : c)));
    }
  }

  /** Shared by the composer submit and the draft card's "Regenerate" action — both are just a new chat turn. */
  async function sendChatMessage(messageText: string) {
    if (!messageText.trim() || sending || pending) return;

    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/modules/ai-assistant/conversations", { method: "POST" });
      const data = await res.json();
      convId = data.id;
      setActiveId(convId);
      setConversations((prev) => [{ id: data.id, title: data.title, updatedAt: data.updatedAt }, ...prev]);
    }

    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/modules/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: messageText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }
      // Server response replays the user turn plus any tool activity and the final answer —
      // swap out the optimistic user-only entry for the authoritative set.
      setMessages((prev) => [...prev.slice(0, -1), ...data.messages]);
      setPending(data.status === "confirm" ? data.toolCall : null);
      refreshConversations();
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendChatMessage(text);
  }

  async function respondToConfirmation(approve: boolean) {
    if (!pending || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/modules/ai-assistant/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, toolCallId: pending.id, approve }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }
      setMessages((prev) => [...prev, ...data.messages]);
      setPending(data.status === "confirm" ? data.toolCall : null);
      refreshConversations();
    } finally {
      setSending(false);
    }
  }

  if (!hasActiveProvider) {
    return (
      <EmptyState
        accent={ACCENT}
        icon={Plug}
        title="No AI provider configured"
        description="Add an API key for Claude, GPT, Groq, or a custom endpoint to start chatting."
        action={
          <Button type="button" onClick={onNeedProviders}>
            Configure a provider
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ "--accent": ACCENT } as React.CSSProperties} className="flex flex-1 min-h-0 gap-3 md:gap-4">
      {/* Conversation rail — a floating glass panel, so blur is fair game here. */}
      <aside
        aria-label="Conversations"
        className="glass flex w-48 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl p-2 sm:w-56 lg:w-64"
      >
        <Button type="button" onClick={newConversation} className="h-11 w-full justify-center gap-1.5 md:h-9">
          <Plus />
          New chat
        </Button>

        <div className="stagger flex flex-col gap-0.5">
          {conversations.map((c, i) =>
            editingId === c.id ? (
              <Input
                key={c.id}
                autoFocus
                aria-label="Conversation title"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                className="h-9 text-xs md:text-xs"
                style={{ "--i": i } as React.CSSProperties}
              />
            ) : (
              <div
                key={c.id}
                onClick={() => openConversation(c.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename(c);
                }}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(
                  "group relative flex min-h-11 cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-1 pl-3 text-xs transition-colors md:min-h-9",
                  activeId === c.id
                    ? "bg-foreground/[0.06] text-foreground dark:bg-white/[0.08]"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
                )}
              >
                {activeId === c.id && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-0.5 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--accent)]"
                  />
                )}
                <span className="flex-1 truncate">{c.title}</span>
                {/* Always visible on touch (no hover there); hover-revealed from md up. */}
                <span className="flex shrink-0 items-center transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${c.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(c);
                    }}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${c.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:h-7 md:w-7"
                  >
                    <Trash2 />
                  </Button>
                </span>
              </div>
            )
          )}
          {conversations.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-h-0">
        {/* Transcript is a reading surface — solid bubbles, never blurred. */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
            {messages.length === 0 && !loadingConvo && (
              <EmptyState
                accent={ACCENT}
                icon={MessageSquare}
                title="Ask anything"
                description="It can search, create, update, and delete your notes."
              />
            )}
            {/* Only on a cold open — while switching conversations the previous transcript stays put. */}
            {loadingConvo && messages.length === 0 && (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-14 w-2/3 self-end rounded-2xl" />
                <Skeleton className="h-20 w-4/5 rounded-2xl" />
                <Skeleton className="h-14 w-1/2 rounded-2xl" />
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                conversationId={activeId}
                regenerateDisabled={sending || !!pending}
                discarded={!!m.toolCallId && discardedDrafts.has(m.toolCallId)}
                onDiscardDraft={(id) => setDiscardedDrafts((prev) => new Set(prev).add(id))}
                onRegenerateDraft={sendChatMessage}
              />
            ))}
            {sending && !pending && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3">
          {pending && (
            <div className="animate-fade-in-up rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 shadow-[var(--glass-shadow)]">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  <ShieldAlert className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Approval required</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {pending.name === "send_email" ? (
                      "The assistant wants to send an email. Nothing sends until you approve."
                    ) : (
                      <>
                        The assistant wants to run <code className="font-mono text-foreground">{pending.name}</code>. Nothing runs
                        until you approve.
                      </>
                    )}
                  </p>
                  {pending.name === "send_email" ? (
                    <dl className="mt-2 flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-xs">
                      {(["to", "cc", "bcc", "subject"] as const).map((field) => {
                        const value = pending.arguments[field];
                        if (typeof value !== "string" || !value.trim()) return null;
                        return (
                          <div key={field} className="flex gap-2">
                            <dt className="w-14 shrink-0 font-medium text-muted-foreground capitalize">{field}</dt>
                            <dd className="min-w-0 truncate">{value}</dd>
                          </div>
                        );
                      })}
                      {typeof pending.arguments.body === "string" && (
                        <div className="flex flex-col gap-0.5 border-t border-border pt-1.5">
                          <dt className="font-medium text-muted-foreground">Body</dt>
                          <dd className="max-h-28 overflow-auto leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {pending.arguments.body}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-border bg-background/60 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(pending.arguments, null, 2)}
                    </pre>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => respondToConfirmation(true)}
                      disabled={sending}
                      className="h-11 px-4 md:h-9"
                    >
                      <Check />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="destructive"
                      onClick={() => respondToConfirmation(false)}
                      disabled={sending}
                      className="h-11 px-4 md:h-9"
                    >
                      <X />
                      Deny
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {/* Floating composer — the one blurred surface in the chat column. */}
          <form onSubmit={handleSubmit}>
            <div
              className={cn(
                "glass focus-glow flex items-center gap-2 rounded-2xl p-2 transition-[border-color,box-shadow] duration-200",
                pending && "opacity-60"
              )}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pending ? "Resolve the pending action above first…" : "Message the assistant…"}
                disabled={!!pending}
                aria-label="Message the assistant"
                className="h-11 flex-1 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent md:text-sm dark:bg-transparent dark:disabled:bg-transparent"
              />
              <Button
                type="submit"
                aria-label="Send message"
                disabled={sending || !input.trim() || !!pending}
                className="h-11 w-11 shrink-0 rounded-xl md:h-9 md:w-9"
              >
                <Send />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
