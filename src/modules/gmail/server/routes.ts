import { cookies } from "next/headers";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { setSecret, deleteSecret } from "@/lib/kernel/secrets";
import {
  addLabelToEmail,
  getEmail,
  invalidateGmailToken,
  isInboxFilter,
  isValidEmailList,
  listInbox,
  markEmailAsRead,
  sendEmail,
} from "@/lib/integrations/gmail";
import { buildAuthUrl, exchangeCodeForTokens } from "./google";

const STATE_COOKIE = "gmail_oauth_state";

function redirectUriFor(origin: string): string {
  return `${origin}/api/modules/gmail/oauth/callback`;
}

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/status",
      handler: async () => {
        let configured = false;
        let connected = false;
        try {
          await ctx.secrets.get("GMAIL_CLIENT_ID");
          await ctx.secrets.get("GMAIL_CLIENT_SECRET");
          configured = true;
        } catch {
          // not configured yet
        }
        try {
          await ctx.secrets.get("GMAIL_REFRESH_TOKEN");
          connected = true;
        } catch {
          // not connected yet
        }
        return Response.json({ configured, connected });
      },
    },
    {
      method: "POST",
      path: "/credentials",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
        const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
        if (!clientId || !clientSecret) {
          return Response.json({ error: "Client ID and Client Secret are required." }, { status: 400 });
        }
        await setSecret("GMAIL_CLIENT_ID", clientId);
        await setSecret("GMAIL_CLIENT_SECRET", clientSecret);
        invalidateGmailToken();
        return Response.json({ ok: true });
      },
    },
    {
      method: "GET",
      path: "/oauth/start",
      handler: async (req) => {
        let clientId: string;
        try {
          clientId = await ctx.secrets.get("GMAIL_CLIENT_ID");
        } catch {
          return Response.json({ error: "Save your Client ID/Secret first." }, { status: 400 });
        }

        const origin = new URL(req.url).origin;
        const state = crypto.randomUUID();

        const jar = await cookies();
        jar.set(STATE_COOKIE, state, { httpOnly: true, path: "/", maxAge: 600, sameSite: "lax" });

        return new Response(null, {
          status: 302,
          headers: { Location: buildAuthUrl(clientId, redirectUriFor(origin), state) },
        });
      },
    },
    {
      method: "GET",
      path: "/oauth/callback",
      handler: async (req) => {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const jar = await cookies();
        const cookieState = jar.get(STATE_COOKIE)?.value;
        jar.delete(STATE_COOKIE);

        const redirectTo = (status: "connected" | "error", message?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `${url.origin}/dashboard/gmail?status=${status}${message ? `&message=${encodeURIComponent(message)}` : ""}`,
            },
          });

        if (!code || !state || !cookieState || state !== cookieState) {
          return redirectTo("error", "OAuth state mismatch — please try connecting again.");
        }

        try {
          const clientId = await ctx.secrets.get("GMAIL_CLIENT_ID");
          const clientSecret = await ctx.secrets.get("GMAIL_CLIENT_SECRET");
          const tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri: redirectUriFor(url.origin) });

          if (!tokens.refreshToken) {
            return redirectTo(
              "error",
              "Google did not return a refresh token — revoke access at https://myaccount.google.com/permissions and try connecting again."
            );
          }

          await setSecret("GMAIL_REFRESH_TOKEN", tokens.refreshToken);
          invalidateGmailToken();
          ctx.events.emit("gmail.connected", {});
          return redirectTo("connected");
        } catch (err) {
          return redirectTo("error", err instanceof Error ? err.message : "Connection failed.");
        }
      },
    },
    {
      method: "POST",
      path: "/disconnect",
      handler: async () => {
        await deleteSecret("GMAIL_REFRESH_TOKEN");
        invalidateGmailToken();
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
        const filter = isInboxFilter(rawFilter) ? rawFilter : "today-unread";
        try {
          return Response.json(await listInbox(filter, q));
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
      // The one and only send path — always a manual, user-initiated action, whether the
      // draft came from the AI Assistant's draft_email tool or was typed here from scratch.
      // The AI never calls this directly; see ai-assistant/server/gmailTools.ts.
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
