"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MessageList } from "./MessageList";
import { MessageDetail } from "./MessageDetail";
import type { EmailDetail, EmailSummary } from "./types";

export function InboxView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<EmailSummary[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  // Lazily seeded from ?open=<id> (Global Search deep link) so the correct message/loading
  // state is already correct on first render — the effect below only needs to fetch the data
  // and defer its setState calls into the fetch's .then()/.finally(), not call them directly.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("open"));
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(() => searchParams.has("open"));

  function loadMessages(q: string) {
    setLoadingList(true);
    fetch(`/api/modules/gmail/messages${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadMessages(query), query ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [query]);

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

  return (
    <div className="flex flex-1 min-h-0 gap-0 overflow-hidden rounded-lg border">
      <div className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col border-r`}>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mail…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList messages={messages} loading={loadingList} selectedId={selectedId} onSelect={openMessage} />
        </div>
      </div>

      <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
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
