import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { setSecret, deleteSecret } from "@/lib/kernel/secrets";
import {
  addLabelToEmail,
  FILTER_LIMITS,
  getEmail,
  invalidateGmailToken,
  isInboxFilter,
  isValidEmailList,
  listInbox,
  markEmailAsRead,
  sendEmail,
} from "@/lib/integrations/gmail";
import { runGmailSyncTick } from "@/lib/integrations/gmail-sync";

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  return [
    {
      method: "POST",
      path: "/connect",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const appPassword = typeof body.appPassword === "string" ? body.appPassword.replace(/\s/g, "") : "";

        if (!email || !appPassword) {
          return Response.json({ error: "Email and App Password are required." }, { status: 400 });
        }

        if (appPassword.length !== 16) {
          return Response.json({ error: "App Password must be exactly 16 characters." }, { status: 400 });
        }

        // Test the connection before saving
        try {
          const imaps = await import("imap-simple");
          const connection = await imaps.connect({
            imap: {
              host: "imap.gmail.com",
              port: 993,
              tls: true,
              tlsOptions: { rejectUnauthorized: true, servername: "imap.gmail.com" },
              user: email,
              password: appPassword,
              authTimeout: 10000,
            },
          });
          connection.end();
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Could not connect to Gmail — check your credentials." },
            { status: 401 }
          );
        }

        await setSecret("GMAIL_EMAIL", email);
        await setSecret("GMAIL_APP_PASSWORD", appPassword);
        await invalidateGmailToken();
        // Populate Mongo immediately instead of leaving the inbox empty for up to a full
        // sync interval — errors here don't fail the connect request, the next scheduled
        // tick will just retry.
        runGmailSyncTick().catch(() => {});
        ctx.events.emit("gmail.connected", {});
        return Response.json({ ok: true });
      },
    },
    {
      method: "POST",
      path: "/disconnect",
      handler: async () => {
        await deleteSecret("GMAIL_EMAIL");
        await deleteSecret("GMAIL_APP_PASSWORD");
        await invalidateGmailToken();
        ctx.events.emit("gmail.disconnected", {});
        return Response.json({ ok: true });
      },
    },
    {
      method: "GET",
      path: "/messages",
      handler: async (req) => {
        const params = new URL(req.url).searchParams;
        const q = params.get("q")?.trim() ?? "";
        const rawFilter = params.get("filter") ?? "";
        const filter = isInboxFilter(rawFilter) ? rawFilter : "today";
        try {
          return Response.json(await listInbox(filter, q, FILTER_LIMITS[filter]));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load messages." }, { status: 502 });
        }
      },
    },
    {
      method: "GET",
      path: "/messages/:id",
      handler: async (_req, params) => {
        try {
          return Response.json(await getEmail(params.id));
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not load message." }, { status: 502 });
        }
      },
    },
    {
      method: "POST",
      path: "/messages/:id/read",
      handler: async (_req, params) => {
        try {
          await markEmailAsRead(params.id);
          return Response.json({ ok: true });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not mark as read." }, { status: 502 });
        }
      },
    },
    {
      method: "POST",
      path: "/messages/:id/label",
      handler: async (req, params) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const label = typeof body.label === "string" ? body.label.trim() : "";
        if (!label) return Response.json({ error: "Label name is required." }, { status: 400 });
        try {
          await addLabelToEmail(params.id, label);
          ctx.events.emit("gmail.email.labeled", { messageId: params.id, label });
          return Response.json({ ok: true });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not add label." }, { status: 502 });
        }
      },
    },
    {
      method: "POST",
      path: "/send",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const to = typeof body.to === "string" ? body.to.trim() : "";
        const cc = typeof body.cc === "string" ? body.cc.trim() : "";
        const bcc = typeof body.bcc === "string" ? body.bcc.trim() : "";
        const subject = typeof body.subject === "string" ? body.subject.trim() : "";
        const emailBody = typeof body.body === "string" ? body.body : "";

        if (!to || !subject || !emailBody) {
          return Response.json({ error: "To, subject, and body are required." }, { status: 400 });
        }
        if (!isValidEmailList(to) || !isValidEmailList(cc) || !isValidEmailList(bcc)) {
          return Response.json({ error: "One or more email addresses are invalid." }, { status: 400 });
        }

        try {
          const result = await sendEmail({ to, cc: cc || undefined, bcc: bcc || undefined, subject, body: emailBody });
          ctx.events.emit("gmail.email.sent", { to, subject });
          return Response.json({ ok: true, id: result.id });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Could not send email." }, { status: 502 });
        }
      },
    },
  ];
}
