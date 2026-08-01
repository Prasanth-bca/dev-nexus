"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, Mail, MailOpen, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getModuleAccent } from "@/lib/icon-map";
import { MessageList } from "./MessageList";
import { MessageDetail } from "./MessageDetail";
import type { EmailDetail, EmailSummary, InboxFilter } from "./types";

const ACCENT = getModuleAccent("gmail");

const FILTERS: { value: InboxFilter; label: string; icon: typeof Mail; emptyTitle: string; emptyBody: string }[] = [
  {
    value: "today-unread",
    label: "Today",
    icon: Sun,
    emptyTitle: "Nothing new today",
    emptyBody: "No unread mail has arrived today. Try Unread or All to look further back.",
  },
  {
    value: "unread",
    label: "Unread",
    icon: Mail,
    emptyTitle: "Inbox zero",
    emptyBody: "Nothing unread in your inbox.",
  },
  {
    value: "today",
    label: "All today",
    icon: MailOpen,
    emptyTitle: "No mail today",
    emptyBody: "Nothing has arrived in your inbox today.",
  },
  {
    value: "all",
    label: "All",
    icon: Inbox,
    emptyTitle: "No emails found",
    emptyBody: "Your inbox looks empty — check back once new mail arrives.",
  },
];

export function InboxView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  // Defaults to today's unread — the triage view you actually want on arrival.
  const [filter, setFilter] = useState<InboxFilter>("today-unread");
  const [messages, setMessages] = useState<EmailSummary[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  // Lazily seeded from ?open=<id> (Global Search deep link) so the correct message/loading
  // state is already correct on first render — the effect below only needs to fetch the data
  // and defer its setState calls into the fetch's .then()/.finally(), not call them directly.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("open"));
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(() => searchParams.has("open"));

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setLoadingList(true);
        const params = new URLSearchParams({ filter });
        if (query.trim()) params.set("q", query.trim());
        fetch(`/api/modules/gmail/messages?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => setMessages(Array.isArray(data) ? data : []))
          .finally(() => setLoadingList(false));
      },
      query ? 300 : 0
    );
    return () => clearTimeout(timeout);
  }, [query, filter]);

  function openMessage(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    fetch(`/api/modules/gmail/messages/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedEmail(data);
        setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, unread: false } : m)) ?? prev);
      })
      .finally(() => setLoadingDetail(false));
  }

  // Deep-link support (e.g. from Global Search): fetch the message ?open= already pointed at.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    fetch(`/api/modules/gmail/messages/${openId}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedEmail(data);
        setMessages((prev) => prev?.map((m) => (m.id === openId ? { ...m, unread: false } : m)) ?? prev);
      })
      .finally(() => setLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMarkedRead(id: string) {
    setSelectedEmail((prev) => (prev && prev.id === id ? { ...prev, unread: false } : prev));
    setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, unread: false } : m)) ?? prev);
  }

  const active = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const unreadCount = messages?.filter((m) => m.unread).length ?? 0;

  return (
    <div className="animate-fade-in flex flex-1 min-h-0 gap-3 overflow-hidden">
      {/* Conversation list — a floating glass panel, the one blurred surface here. */}
      <div
        style={{ "--accent": ACCENT } as React.CSSProperties}
        className={`${selectedId ? "hidden md:flex" : "flex"} glass w-full shrink-0 flex-col overflow-hidden rounded-xl md:w-80`}
      >
        <div className="flex flex-col gap-2 border-b border-[var(--glass-border)] p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${active.label.toLowerCase()}…`}
              aria-label="Search mail"
              className="h-9 rounded-lg pl-8 text-sm"
            />
          </div>

          <div role="group" aria-label="Filter messages" className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const isActive = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-200",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]"
                      : "border-border text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  <f.icon className="h-3 w-3" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {!loadingList && messages && messages.length > 0 && (
            <p className="px-0.5 text-[11px] text-muted-foreground">
              {messages.length} message{messages.length === 1 ? "" : "s"}
              {unreadCount > 0 && ` · ${unreadCount} unread`}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList
            messages={messages}
            loading={loadingList}
            selectedId={selectedId}
            onSelect={openMessage}
            emptyTitle={query.trim() ? "No matches" : active.emptyTitle}
            emptyDescription={query.trim() ? `Nothing in ${active.label} matches “${query.trim()}”.` : active.emptyBody}
          />
        </div>
      </div>

      {/* Reading pane — solid surface, never blurred. */}
      <div
        className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card`}
      >
        <MessageDetail
          email={selectedEmail}
          loading={loadingDetail}
          onClose={() => {
            setSelectedId(null);
            setSelectedEmail(null);
          }}
          onMarkedRead={handleMarkedRead}
        />
      </div>
    </div>
  );
}
