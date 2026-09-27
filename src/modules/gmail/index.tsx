import { getUnreadCount, listUnreadEmails, MESSAGES_COLLECTION, searchEmails } from "@/lib/integrations/gmail";
import { ensureGmailSyncStarted } from "@/lib/integrations/gmail-sync";
import type { DevNexusModule } from "@/lib/kernel/types";
import { manifest } from "./manifest";
import { buildRoutes } from "./server/routes";
import { GmailPage } from "./client/GmailPage";

export const gmailModule: DevNexusModule = {
  manifest,

  register(ctx) {
    return {
      routes: buildRoutes(ctx),
      pages: [{ path: "/", component: () => <GmailPage ctx={ctx} /> }],
    };
  },

  async onEnable(ctx) {
    await ctx.db.collection(MESSAGES_COLLECTION).createIndex({ date: -1 });
    ensureGmailSyncStarted();
  },

  async search(_ctx, query) {
    try {
      const emails = await searchEmails(query, 5);
      return emails.map((e) => ({
        id: e.id,
        title: e.subject || "(no subject)",
        description: `${e.from} — ${e.snippet}`,
        url: `/dashboard/gmail?open=${e.id}`,
      }));
    } catch {
      // Not connected, or the request failed — omit Gmail results rather than failing the whole search.
      return [];
    }
  },

  async widget() {
    try {
      const [count, unread] = await Promise.all([getUnreadCount(), listUnreadEmails(4)]);
      return {
        stat: { label: "Unread", value: count },
        items: unread.map((e) => ({
          id: e.id,
          label: e.subject || "(no subject)",
          sublabel: e.from,
          href: `/dashboard/gmail?open=${e.id}`,
        })),
        emptyMessage: "Inbox zero — nothing unread.",
        href: "/dashboard/gmail",
      };
    } catch {
      // Not connected, or the request failed — same graceful-degradation as search().
      return {
        items: [],
        emptyMessage: "Connect Gmail in Settings to see unread mail here.",
        href: "/dashboard/gmail",
      };
    }
  },
};
