import { getDb } from "@/lib/kernel/db";
import { createLogger } from "@/lib/kernel/logger";
import {
  fetchMessagesByUid,
  getImapConnection,
  MESSAGES_COLLECTION,
  searchUids,
  startOfTodayEpoch,
  type GmailMessageDoc,
} from "./gmail";

const logger = createLogger("gmail-sync");

// How far back the sync loop keeps Mongo's copy of the inbox up to date. Deep, one-off
// reads older than this still work (getEmail() falls back to a live IMAP fetch), but
// routine list/unread-count reads only ever need to be as complete as the UI's own
// filters (the widest is "month" = 30 days), so there's no reason to sync further back.
const SYNC_WINDOW_DAYS = 30;
const DEFAULT_INTERVAL_MS = 60_000;

/** The only thing that ever calls IMAP for reads. Everything else (routes, widget, search)
 *  reads Mongo/Redis — see gmail.ts's module doc comment. */
export async function runGmailSyncTick(): Promise<void> {
  let connection;
  try {
    ({ connection } = await getImapConnection());
  } catch {
    // Not connected yet (no secrets) — nothing to sync this tick.
    return;
  }

  try {
    await connection.openBox("INBOX");
    const since = new Date(startOfTodayEpoch() * 1000);
    since.setDate(since.getDate() - SYNC_WINDOW_DAYS);
    const uids = await searchUids(connection, [["SINCE", since]]);

    const db = await getDb();
    const collection = db.collection<GmailMessageDoc>(MESSAGES_COLLECTION);

    const known = await collection
      .find({ _id: { $in: uids.map(String) } }, { projection: { unread: 1 } })
      .toArray();
    const knownUnread = new Map(known.map((d) => [d._id, d.unread]));

    // New mail: fetch full bodies (only for UIDs we've never synced) and upsert.
    const newUids = uids.filter((uid) => !knownUnread.has(String(uid)));
    if (newUids.length > 0) {
      const parsed = await fetchMessagesByUid(connection, newUids);
      if (parsed.length > 0) {
        const now = new Date();
        await collection.bulkWrite(
          parsed.map((p) => ({
            updateOne: {
              filter: { _id: String(p.uid) },
              update: {
                $set: {
                  from: p.from,
                  to: p.to,
                  subject: p.subject,
                  snippet: p.snippet,
                  body: p.body,
                  bodyHtml: p.bodyHtml,
                  date: new Date(p.date),
                  unread: p.unread,
                  syncedAt: now,
                },
              },
              upsert: true,
            },
          }))
        );
      }
    }

    // Already-synced mail we still think is unread: refresh flags only (no body literals —
    // the batched-fetch hang that fetchMessagesByUid works around is specifically about
    // full-body literals, not flags), and flip to read wherever Gmail now disagrees.
    const stillUnreadUids = uids.filter((uid) => knownUnread.get(String(uid)) === true);
    if (stillUnreadUids.length > 0) {
      const flagResults = await connection.search([["UID", ...stillUnreadUids]], { bodies: [] });
      const nowRead = flagResults
        .filter((item) => item.attributes.flags.includes("\\Seen"))
        .map((item) => String(item.attributes.uid));
      if (nowRead.length > 0) {
        await collection.updateMany({ _id: { $in: nowRead } }, { $set: { unread: false } });
      }
    }

    // Synced messages within the window that IMAP no longer reports — moved out of the
    // inbox or deleted; drop them so Dev Nexus's copy doesn't drift from the real mailbox.
    const currentIds = new Set(uids.map(String));
    const staleIds = [...knownUnread.keys()].filter((id) => !currentIds.has(id));
    if (staleIds.length > 0) {
      await collection.deleteMany({ _id: { $in: staleIds } });
    }

    logger.info("sync tick complete", { seen: uids.length, new: newUids.length, staleRemoved: staleIds.length });
  } catch (err) {
    logger.error("sync tick failed", { err: String(err) });
  }
}

declare global {
  var _devNexusGmailSyncStarted: boolean | undefined;
}

/** Starts the recurring background sync loop exactly once per server process — guarded the
 *  same way activity/index.tsx guards its event subscriber, since onEnable() re-runs on
 *  every request in dev (see loader.ts). Fires one tick immediately so a fresh connect
 *  doesn't sit empty for a full interval. */
export function ensureGmailSyncStarted(): void {
  if (global._devNexusGmailSyncStarted) return;
  global._devNexusGmailSyncStarted = true;

  const intervalMs = Number(process.env.GMAIL_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  setInterval(() => {
    runGmailSyncTick().catch((err) => logger.error("unhandled sync tick error", { err: String(err) }));
  }, intervalMs);

  runGmailSyncTick().catch((err) => logger.error("unhandled initial sync error", { err: String(err) }));
}
