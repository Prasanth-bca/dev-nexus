"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

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

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "assistant_tool_call") {
    return (
      <div className="self-start text-xs text-zinc-400 italic">
        🔧 {message.toolName}({JSON.stringify(message.toolArguments)})
      </div>
    );
  }
  if (message.role === "tool_result") {
    return null; // keep raw tool output out of the transcript — the call above and final answer below are enough
  }
  return (
    <div
      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        message.role === "user"
          ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "self-start bg-zinc-100 dark:bg-zinc-900"
      }`}
    >
      {message.content}
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || pending) return;

    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/modules/ai-assistant/conversations", { method: "POST" });
      const data = await res.json();
      convId = data.id;
      setActiveId(convId);
      setConversations((prev) => [{ id: data.id, title: data.title, updatedAt: data.updatedAt }, ...prev]);
    }

    const messageText = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setInput("");
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
      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
        <p className="font-medium mb-1">No AI provider configured</p>
        <p className="text-zinc-600 dark:text-zinc-400 mb-3">
          Add an API key for Claude, GPT, Groq, or a custom endpoint to start chatting.
        </p>
        <button
          type="button"
          onClick={onNeedProviders}
          className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800"
        >
          Configure a provider
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 gap-3">
      <div className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 pr-2 overflow-y-auto">
        <button
          type="button"
          onClick={newConversation}
          className="text-sm rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium py-1.5 mb-1"
        >
          + New Chat
        </button>
        {conversations.map((c) =>
          editingId === c.id ? (
            <input
              key={c.id}
              autoFocus
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
              className="px-2 py-1.5 rounded-md text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 outline-none"
            />
          ) : (
            <div
              key={c.id}
              onClick={() => openConversation(c.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(c);
              }}
              className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer ${
                activeId === c.id ? "bg-zinc-100 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="truncate">{c.title}</span>
              <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(c);
                  }}
                  title="Rename"
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  title="Delete"
                  className="text-zinc-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            </div>
          )
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 mb-3 pr-1">
          {messages.length === 0 && !loadingConvo && (
            <p className="text-sm text-zinc-400">Ask anything — it can search, create, update, and delete your notes.</p>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {sending && !pending && <div className="self-start text-sm text-zinc-400">Thinking…</div>}
          <div ref={bottomRef} />
        </div>

        {pending && (
          <div className="mb-3 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <p className="font-medium mb-1">Confirm action</p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              Run <code className="text-xs font-mono">{pending.name}</code>
              <code className="text-xs font-mono">({JSON.stringify(pending.arguments)})</code>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => respondToConfirmation(true)}
                disabled={sending}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => respondToConfirmation(false)}
                disabled={sending}
                className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pending ? "Resolve the pending action above first…" : "Message the assistant…"}
            disabled={!!pending}
            className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !!pending}
            className="text-sm px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
