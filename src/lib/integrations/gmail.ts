import { getSecret } from "@/lib/kernel/secrets";
import { EXTERNAL_FETCH_TIMEOUT_MS } from "@/lib/fetch-timeout";

/**
 * Shared Gmail API client — lives here (not inside the `gmail` module) so it can be used by
 * both the Gmail module itself and other modules (currently AI Assistant's tools) without
 * one module importing another's internals directly, which the module contract disallows.
 * Auth is via the refresh token the `gmail` module's OAuth flow already stored in Secret Manager.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailApiError {
  error?: { message?: string };
}

declare global {
  var _devNexusGmailToken: { value: string; expiresAt: number } | undefined;
}

async function refreshAccessToken(): Promise<{ value: string; expiresAt: number }> {
  const clientId = await getSecret("GMAIL_CLIENT_ID");
  const clientSecret = await getSecret("GMAIL_CLIENT_SECRET");
  const refreshToken = await getSecret("GMAIL_REFRESH_TOKEN");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  // Google access tokens last ~1h. Expire ours a minute early so a token can't
  // lapse mid-flight on a request that's already been authorised.
  const ttlSeconds = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return { value: data.access_token, expiresAt: Date.now() + (ttlSeconds - 60) * 1000 };
}

/**
 * Cached on `global` (same pattern as the Mongo client) because this used to run on
 * *every* API call — listing 20 messages meant 21 token refreshes on top of 21 data
 * requests, which is what made the inbox take tens of seconds to load.
 */
async function getAccessToken(): Promise<string> {
  const cached = global._devNexusGmailToken;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const fresh = await refreshAccessToken();
  global._devNexusGmailToken = fresh;
  return fresh.value;
}

/** Called when credentials change, so a stale token can't outlive the account it belongs to. */
export function invalidateGmailToken(): void {
  global._devNexusGmailToken = undefined;
}

async function gmailFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GmailApiError;
    throw new Error(`Gmail API ${path} failed (${res.status}): ${body.error?.message ?? res.statusText}`);
  }
  return res.json();
}

export interface UnreadEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

/**
 * Runs a raw Gmail search query and fetches metadata for each hit.
 *
 * Gmail's list endpoint returns only ids, so a second request per message is
 * unavoidable — but those run concurrently rather than in series. Promise.all
 * preserves input order, so results keep Gmail's own newest-first ordering.
 */
async function fetchMessages(query: string, maxResults: number): Promise<UnreadEmail[]> {
  const list = await gmailFetch<{ messages?: Array<{ id: string }> }>(
    `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  );
  const ids = (list.messages ?? []).map((m) => m.id);

  return Promise.all(
    ids.map(async (id) => {
      const msg = await gmailFetch<{ snippet?: string; labelIds?: string[]; payload?: { headers?: GmailHeader[] } }>(
        `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      );
      const headers = msg.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
      return {
        id,
        from: get("From"),
        subject: get("Subject"),
        snippet: msg.snippet ?? "",
        date: get("Date"),
        unread: (msg.labelIds ?? []).includes("UNREAD"),
      };
    })
  );
}

export const INBOX_FILTERS = ["today-unread", "unread", "today", "all"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export function isInboxFilter(value: string): value is InboxFilter {
  return (INBOX_FILTERS as readonly string[]).includes(value);
}

/** Start of the current local day, as Unix seconds. */
function startOfTodayEpoch(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Builds the Gmail query for a filter.
 *
 * `after:` is given an epoch timestamp rather than a YYYY/MM/DD date: Gmail treats
 * bare dates inconsistently at the day boundary (so "Today" could return nothing on
 * the day itself), whereas an epoch second is exact. Since Dev Nexus runs locally,
 * the server's midnight is the user's midnight.
 *
 * Caveat: epoch input to `after:` is long-standing but *undocumented* Gmail behaviour.
 * If the Today filters ever start coming back empty despite mail having arrived, that
 * is the first thing to suspect — swap to `newer_than:1d` (a rolling 24h window,
 * documented, but not calendar-day accurate).
 */
function filterQuery(filter: InboxFilter): string {
  switch (filter) {
    case "today-unread":
      return `in:inbox is:unread after:${startOfTodayEpoch()}`;
    case "unread":
      return "in:inbox is:unread";
    case "today":
      return `in:inbox after:${startOfTodayEpoch()}`;
    case "all":
      return "in:inbox";
  }
}

export async function listUnreadEmails(maxResults = 10): Promise<UnreadEmail[]> {
  return fetchMessages("is:unread", maxResults);
}

/** Free-text search across all mail (not just the inbox) — powers Global Search. */
export async function searchEmails(query: string, maxResults = 5): Promise<UnreadEmail[]> {
  return fetchMessages(query, maxResults);
}

/**
 * The Inbox view's listing. A free-text term is scoped *within* the active filter,
 * so the chips behave like filters rather than being silently overridden by search.
 */
export async function listInbox(filter: InboxFilter = "all", search = "", maxResults = 25): Promise<UnreadEmail[]> {
  const term = search.trim();
  const query = term ? `${filterQuery(filter)} ${term}` : filterQuery(filter);
  return fetchMessages(query, maxResults);
}

/** True unread total (not capped by a maxResults page) — powers the Dashboard widget's headline stat. */
export async function getUnreadCount(): Promise<number> {
  const label = await gmailFetch<{ messagesUnread?: number }>("/labels/UNREAD");
  return label.messagesUnread ?? 0;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function findPart(payload: GmailPart, mimeType: string): GmailPart | null {
  if (payload.mimeType === mimeType && payload.body?.data) return payload;
  for (const part of payload.parts ?? []) {
    const found = findPart(part, mimeType);
    if (found) return found;
  }
  return null;
}

/** Crude but safe HTML→text conversion — emails only ever get rendered as plain text, never as raw HTML (XSS risk on untrusted content). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBody(payload: GmailPart): string {
  const plain = findPart(payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);

  const html = findPart(payload, "text/html");
  if (html?.body?.data) return htmlToText(decodeBase64Url(html.body.data));

  return "(No readable content in this message.)";
}

export interface EmailDetail extends UnreadEmail {
  to: string;
  body: string;
}

export async function getEmail(id: string): Promise<EmailDetail> {
  const msg = await gmailFetch<{
    snippet?: string;
    labelIds?: string[];
    payload?: GmailPart & { headers?: GmailHeader[] };
  }>(`/messages/${id}?format=full`);

  const headers = msg.payload?.headers ?? [];
  const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";

  return {
    id,
    from: get("From"),
    to: get("To"),
    subject: get("Subject"),
    date: get("Date"),
    snippet: msg.snippet ?? "",
    unread: (msg.labelIds ?? []).includes("UNREAD"),
    body: msg.payload ? extractBody(msg.payload) : "(No readable content in this message.)",
  };
}

async function findOrCreateLabelId(name: string): Promise<string> {
  const list = await gmailFetch<{ labels?: Array<{ id: string; name: string }> }>("/labels");
  const existing = (list.labels ?? []).find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  const created = await gmailFetch<{ id: string }>("/labels", {
    method: "POST",
    body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
  });
  return created.id;
}

export async function addLabelToEmail(messageId: string, labelName: string): Promise<void> {
  const labelId = await findOrCreateLabelId(labelName);
  await gmailFetch(`/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

export async function markEmailAsRead(messageId: string): Promise<void> {
  await gmailFetch(`/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates a comma-separated address list (used for To/Cc/Bcc). An empty string is valid — it just means "not set". */
export function isValidEmailList(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .every((s) => s.length > 0 && EMAIL_RE.test(s));
}

/** Requires the gmail.send scope — connections made before that scope existed need to reconnect. */
export async function sendEmail(params: { to: string; cc?: string; bcc?: string; subject: string; body: string }): Promise<{ id: string }> {
  const headers = [`To: ${params.to}`];
  if (params.cc?.trim()) headers.push(`Cc: ${params.cc.trim()}`);
  if (params.bcc?.trim()) headers.push(`Bcc: ${params.bcc.trim()}`);
  headers.push(`Subject: ${params.subject}`, `Content-Type: text/plain; charset="UTF-8"`, "", params.body);

  const raw = Buffer.from(headers.join("\r\n")).toString("base64url");

  return gmailFetch<{ id: string }>("/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}
