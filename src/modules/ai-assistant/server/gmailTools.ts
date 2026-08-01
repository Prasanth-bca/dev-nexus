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
    name: "send_email",
    description:
      "Send a new email from the user's connected Gmail account. Only call this when the user has clearly asked to send an email, and confirm the recipient/subject/body match what they asked for.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
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
      case "send_email": {
        const to = String(args.to ?? "");
        const subject = String(args.subject ?? "");
        const result = await sendEmail({ to, subject, body: String(args.body ?? "") });
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
