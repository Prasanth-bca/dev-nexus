import { addLabelToEmail, listUnreadEmails, markEmailAsRead, sendEmail } from "@/lib/integrations/gmail";
import type { ModuleContext } from "@/lib/kernel/context";
import type { ToolDef } from "./providers";

export const GMAIL_TOOLS: ToolDef[] = [
  {
    name: "list_unread_emails",
    description: "List the user's unread Gmail messages — id, from, subject, snippet, and date. Requires Gmail to be connected in Dev Nexus.",
    parameters: {
      type: "object",
      properties: { maxResults: { type: "number", description: "Maximum number of emails to return (default 10)" } },
    },
  },
  {
    name: "add_email_label",
    description: "Add a Gmail label to a specific email by its id. Creates the label first if it doesn't already exist.",
    parameters: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "The email's id, from list_unread_emails" },
        label: { type: "string", description: "Label name to apply" },
      },
      required: ["messageId", "label"],
    },
  },
  {
    name: "mark_email_read",
    description: "Mark a specific email as read by its id.",
    parameters: {
      type: "object",
      properties: { messageId: { type: "string" } },
      required: ["messageId"],
    },
  },
  {
    name: "draft_email",
    description:
      "Compose or revise an email draft for the user to review, edit, and send themselves — this never sends anything. Always use " +
      "this instead of trying to send email directly; there is no tool that sends on your behalf. Call it once to create a new " +
      "draft, or call it again with the same intent plus the requested change (e.g. 'make it more professional', 'add a CC', " +
      "'shorten it') to revise the most recent draft in this conversation — carry forward every field the user didn't ask to " +
      "change rather than starting over from a blank draft.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address(es), comma-separated" },
        cc: { type: "string", description: "CC email address(es), comma-separated (omit if none)" },
        bcc: { type: "string", description: "BCC email address(es), comma-separated (omit if none)" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain text email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "send_email",
    description:
      "Send an email immediately from the user's connected Gmail account, without a review step — only use this when the user " +
      "has clearly asked you to send an email right now with a specific recipient, subject, and body, not when they want to " +
      "compose, draft, or review something first (use draft_email for that). This still requires the user's explicit approval " +
      "before it actually sends — never send speculatively or as an example.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address(es), comma-separated" },
        cc: { type: "string", description: "CC email address(es), comma-separated (omit if none)" },
        bcc: { type: "string", description: "BCC email address(es), comma-separated (omit if none)" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain text email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
];

export async function runGmailTool(ctx: ModuleContext, name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "list_unread_emails": {
        const maxResults = typeof args.maxResults === "number" ? args.maxResults : 10;
        return JSON.stringify(await listUnreadEmails(maxResults));
      }
      case "add_email_label": {
        const messageId = String(args.messageId ?? "");
        const label = String(args.label ?? "");
        await addLabelToEmail(messageId, label);
        ctx.events.emit("gmail.email.labeled", { messageId, label, source: "ai-assistant" });
        return JSON.stringify({ ok: true });
      }
      case "mark_email_read": {
        await markEmailAsRead(String(args.messageId ?? ""));
        return JSON.stringify({ ok: true });
      }
      case "draft_email": {
        // No Gmail API call and no confirmation gate — drafting has no outbound effect.
        // The draft is rendered as an editable card client-side (see ChatView's
        // MessageBubble); actually sending it is a manual action against a separate
        // route (gmail's POST /send) that this loop never touches.
        return JSON.stringify({
          to: String(args.to ?? "").trim(),
          cc: typeof args.cc === "string" ? args.cc.trim() : "",
          bcc: typeof args.bcc === "string" ? args.bcc.trim() : "",
          subject: String(args.subject ?? "").trim(),
          body: String(args.body ?? ""),
        });
      }
      case "send_email": {
        // Only reachable after the confirmation gate approves it (send_email is in
        // DEFAULT_CONFIRM_REQUIRED) — unlike draft_email, this one really sends.
        const to = String(args.to ?? "").trim();
        const cc = typeof args.cc === "string" ? args.cc.trim() : "";
        const bcc = typeof args.bcc === "string" ? args.bcc.trim() : "";
        const subject = String(args.subject ?? "").trim();
        const body = String(args.body ?? "");
        const result = await sendEmail({ to, cc: cc || undefined, bcc: bcc || undefined, subject, body });
        ctx.events.emit("gmail.email.sent", { to, subject, source: "ai-assistant" });
        return JSON.stringify({ ok: true, id: result.id });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "Gmail request failed. Is it connected in /dashboard/gmail?" });
  }
}
