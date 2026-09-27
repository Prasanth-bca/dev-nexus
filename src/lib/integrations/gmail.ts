import * as imaps from "imap-simple";
import { simpleParser } from "mailparser";
import * as nodemailer from "nodemailer";
import { getSecret } from "@/lib/kernel/secrets";
import { getDb } from "@/lib/kernel/db";
import { cacheGet, cacheSet, cacheSetList, cacheDel, clearListCache } from "./gmail-cache";

type AddressObject = any;

/**
 * Gmail integration via IMAP/SMTP + App Passwords, backed by a Mongo-synced local copy.
 *
 * Reads (list/detail/unread counts/search) never talk to IMAP directly — a background sync
 * loop (gmail-sync.ts) is the only thing that fetches from Gmail, into the `gmail_messages`
 * collection, and reads go through a short-TTL Redis cache in front of that collection
 * (gmail-cache.ts). Mutations that must be live (mark-as-read, send) still touch Gmail
 * directly, and also update Mongo + invalidate the cache immediately.
 */

const IMAP_CONFIG = {
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: true, servername: "imap.gmail.com" },
  authTimeout: 10000,
};

const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  tls: { servername: "smtp.gmail.com" },
};

export const MESSAGES_COLLECTION = "gmail_messages";

interface ImapConnection {
  connection: imaps.ImapSimple;
  email: string;
}

declare global {
  var _devNexusImapConnection: ImapConnection | undefined;
}

export async function getImapConnection(): Promise<ImapConnection> {
  if (global._devNexusImapConnection) {
    try {
      // Test if connection is still alive
      await global._devNexusImapConnection.connection.getBoxes();
      return global._devNexusImapConnection;
    } catch {
      global._devNexusImapConnection = undefined;
    }
  }

  const email = await getSecret("GMAIL_EMAIL");
  const password = await getSecret("GMAIL_APP_PASSWORD");

  const connection = await imaps.connect({
    imap: {
      ...IMAP_CONFIG,
      user: email,
      password,
    },
  });

  global._devNexusImapConnection = { connection, email };
  return global._devNexusImapConnection;
}

async function getSmtpTransporter(): Promise<{ email: string; transporter: nodemailer.Transporter }> {
  const email = await getSecret("GMAIL_EMAIL");
  const password = await getSecret("GMAIL_APP_PASSWORD");

  const transporter = nodemailer.createTransport({
    ...SMTP_CONFIG,
    auth: { user: email, pass: password },
  });

  return { email, transporter };
}

export async function invalidateGmailToken(): Promise<void> {
  if (global._devNexusImapConnection) {
    global._devNexusImapConnection.connection.end();
    global._devNexusImapConnection = undefined;
  }
  await clearListCache();
}

export interface UnreadEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface EmailDetail extends UnreadEmail {
  to: string;
  body: string;
  bodyHtml?: string;
}

/** The permanent, synced copy of a message — one doc per Gmail UID. */
export interface GmailMessageDoc {
  _id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  unread: boolean;
  syncedAt: Date;
}

function getFirstAddress(addr: string | AddressObject | AddressObject[] | undefined): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (Array.isArray(addr)) {
    const first = addr[0];
    return first ? `${first.name || ""} <${first.address}>`.trim() : "";
  }
  return addr.value?.[0] ? `${addr.value[0].name || ""} <${addr.value[0].address}>`.trim() : "";
}

function formatAddresses(addr: string | AddressObject | AddressObject[] | undefined): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (Array.isArray(addr)) {
    return addr.map((a: any) => `${a.name || ""} <${a.address}>`.trim()).join(", ");
  }
  return addr.value?.map((a: any) => `${a.name || ""} <${a.address}>`.trim()).join(", ") || "";
}

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

export const INBOX_FILTERS = ["recent", "today", "month", "all"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export function isInboxFilter(value: string): value is InboxFilter {
  return (INBOX_FILTERS as readonly string[]).includes(value);
}

// How many messages a request can return per filter — kept small for "today" since that's
// the default/common case, larger where the filter is an explicit, less-frequent opt-in
// (month/all), and capped even for "all" so a huge synced history can't make a page load
// pull down everything ever synced.
export const FILTER_LIMITS: Record<InboxFilter, number> = {
  recent: 10,
  today: 20,
  month: 100,
  all: 100,
};

export function startOfTodayEpoch(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

// Fetches only matching UIDs (cheap — no bodies). Used by the background sync loop to find
// what's changed since the last tick.
export function searchUids(connection: imaps.ImapSimple, criteria: any[]): Promise<number[]> {
  return new Promise((resolve, reject) => {
    connection.imap.search(criteria, (err, uids) => {
      if (err) reject(err);
      else resolve(uids || []);
    });
  });
}

export interface ParsedGmailMessage {
  uid: number;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  bodyHtml?: string;
  date: string;
  unread: boolean;
}

// Fetches and fully parses one message by UID — the only place that talks to IMAP for a
// message body. Used by the background sync loop for newly-seen UIDs, and as a live
// fallback from getEmail() for a message that hasn't been synced yet.
export async function fetchOneByUid(connection: imaps.ImapSimple, uid: number): Promise<ParsedGmailMessage | null> {
  // Fetch the full raw message so mailparser sees real headers and can correctly decode
  // multipart/MIME bodies — a HEADER-only part comes back from imap-simple pre-parsed into
  // an object, not raw text, and a bare TEXT part has no Content-Type to tell mailparser
  // it's multipart.
  const results = await connection.search([["UID", uid]], {
    bodies: [""],
    struct: true,
  });
  const item = results[0];
  if (!item) return null;

  const all = item.parts.find((p) => p.which === "");
  const parsed = await simpleParser(all?.body || "");
  const body = parsed.text || (parsed.html ? htmlToText(parsed.html) : "(No readable content)");
  const bodyHtml = parsed.html || undefined;

  return {
    uid: item.attributes.uid,
    from: getFirstAddress(parsed.from),
    to: formatAddresses(parsed.to),
    subject: parsed.subject || "(No subject)",
    snippet: body.slice(0, 200).replace(/\s+/g, " ").trim(),
    body,
    bodyHtml,
    date: parsed.date?.toISOString() || new Date().toISOString(),
    unread: !item.attributes.flags.includes("\\Seen"),
  };
}

// One UID per FETCH, run in parallel — NOT a single batched `["UID", ...uids]` search.
// node-imap hangs forever parsing a response with multiple large full-body literals back
// to back; fetching each message's full body separately sidesteps that bug and is still
// fast in parallel (confirmed: 10 full messages in ~8s vs. an indefinite hang).
export async function fetchMessagesByUid(connection: imaps.ImapSimple, uids: number[]): Promise<ParsedGmailMessage[]> {
  if (uids.length === 0) return [];
  const messages = await Promise.all(uids.map((uid) => fetchOneByUid(connection, uid)));
  return messages.filter((m): m is ParsedGmailMessage => m !== null);
}

const LIST_CACHE_TTL_SECONDS = 20;
const DETAIL_CACHE_TTL_SECONDS = 60;

function docToUnreadEmail(doc: GmailMessageDoc): UnreadEmail {
  return {
    id: doc._id,
    from: doc.from,
    subject: doc.subject,
    snippet: doc.snippet,
    date: doc.date.toISOString(),
    unread: doc.unread,
  };
}

function buildMongoQuery(filter: InboxFilter, search: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filter === "today") {
    query.date = { $gte: new Date(startOfTodayEpoch() * 1000) };
  } else if (filter === "month") {
    const monthAgo = new Date(startOfTodayEpoch() * 1000);
    monthAgo.setDate(monthAgo.getDate() - 30);
    query.date = { $gte: monthAgo };
  }
  // "recent" and "all" have no date bound — the sort+limit alone decides scope.

  const term = search.trim();
  if (term) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ subject: re }, { body: re }];
  }

  return query;
}

export async function listInbox(
  filter: InboxFilter = "all",
  search = "",
  maxResults = 25
): Promise<UnreadEmail[]> {
  const cacheKey = `gmail:list:${filter}:${search.trim().toLowerCase()}`;
  const cached = await cacheGet<UnreadEmail[]>(cacheKey);
  if (cached) return cached;

  const db = await getDb();
  const query = buildMongoQuery(filter, search);
  const docs = await db
    .collection<GmailMessageDoc>(MESSAGES_COLLECTION)
    .find(query, { projection: { body: 0, to: 0 } })
    .sort({ date: -1 })
    .limit(maxResults)
    .toArray();
  const messages = docs.map(docToUnreadEmail);

  await cacheSetList(cacheKey, messages, LIST_CACHE_TTL_SECONDS);
  return messages;
}

export async function listUnreadEmails(maxResults = 10): Promise<UnreadEmail[]> {
  const db = await getDb();
  const docs = await db
    .collection<GmailMessageDoc>(MESSAGES_COLLECTION)
    .find({ unread: true }, { projection: { body: 0, to: 0 } })
    .sort({ date: -1 })
    .limit(maxResults)
    .toArray();
  return docs.map(docToUnreadEmail);
}

export async function searchEmails(query: string, maxResults = 5): Promise<UnreadEmail[]> {
  return listInbox("all", query, maxResults);
}

export async function getUnreadCount(): Promise<number> {
  const db = await getDb();
  return db.collection<GmailMessageDoc>(MESSAGES_COLLECTION).countDocuments({ unread: true });
}

export async function getUnreadCountToday(): Promise<number> {
  const db = await getDb();
  return db.collection<GmailMessageDoc>(MESSAGES_COLLECTION).countDocuments({
    unread: true,
    date: { $gte: new Date(startOfTodayEpoch() * 1000) },
  });
}

export async function getEmail(id: string): Promise<EmailDetail> {
  const cacheKey = `gmail:detail:${id}`;
  const cached = await cacheGet<EmailDetail>(cacheKey);
  if (cached) return cached;

  const db = await getDb();
  const collection = db.collection<GmailMessageDoc>(MESSAGES_COLLECTION);
  let doc = await collection.findOne({ _id: id });

  if (!doc) {
    // Not synced yet — brand-new mail still inside the current sync interval, or a deep
    // link older than the sync window. Fetch it live once and backfill Mongo so every
    // later read (including this same message again) comes from the DB.
    const { connection } = await getImapConnection();
    await connection.openBox("INBOX");
    const parsed = await fetchOneByUid(connection, parseInt(id, 10));
    if (!parsed) throw new Error("Email not found");

    doc = {
      _id: id,
      from: parsed.from,
      to: parsed.to,
      subject: parsed.subject,
      snippet: parsed.snippet,
      body: parsed.body,
      bodyHtml: parsed.bodyHtml,
      date: new Date(parsed.date),
      unread: parsed.unread,
      syncedAt: new Date(),
    };
    await collection.updateOne({ _id: id }, { $set: doc }, { upsert: true });
  }

  const detail: EmailDetail = {
    id: doc._id,
    from: doc.from,
    to: doc.to,
    subject: doc.subject,
    snippet: doc.snippet,
    date: doc.date.toISOString(),
    unread: doc.unread,
    body: doc.body,
    bodyHtml: doc.bodyHtml,
  };
  await cacheSet(cacheKey, detail, DETAIL_CACHE_TTL_SECONDS);
  return detail;
}

export async function markEmailAsRead(messageId: string): Promise<void> {
  const db = await getDb();
  await db.collection<GmailMessageDoc>(MESSAGES_COLLECTION).updateOne({ _id: messageId }, { $set: { unread: false } });

  // Best-effort — also flag it \Seen on the actual mailbox so other Gmail clients agree.
  // Mongo (read by Dev Nexus's own UI) is already updated above regardless of this outcome.
  try {
    const { connection } = await getImapConnection();
    await connection.openBox("INBOX");
    await connection.addFlags(parseInt(messageId, 10), "\\Seen");
  } catch (err) {
    console.error("[gmail] failed to sync \\Seen flag to IMAP", err);
  }

  await clearListCache();
  await cacheDel(`gmail:detail:${messageId}`);
}

// IMAP doesn't have native label support like Gmail API — labels would need to be folders.
// For now, this is a no-op (or we could move to a folder).
export async function addLabelToEmail(_messageId: string, _labelName: string): Promise<void> {
  // For now, just no-op.
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailList(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .every((s) => s.length > 0 && EMAIL_RE.test(s));
}

export async function sendEmail(params: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const { transporter } = await getSmtpTransporter();

  const info = await transporter.sendMail({
    from: (await getSecret("GMAIL_EMAIL")),
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    text: params.body,
  });

  return { id: info.messageId };
}
