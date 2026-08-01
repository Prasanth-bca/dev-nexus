import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "gmail",
  name: "Gmail",
  category: "integration",
  icon: "Mail",
  version: "0.1.0",
  description: "A read-and-triage inbox backed by the Gmail API, so email never pulls you out of the platform.",
  highlights: [
    "OAuth 2.0 connection with tokens held in the encrypted Secret Manager",
    "Read, search, mark as read, and apply labels in-app",
    "Message bodies always rendered as plain text — untrusted HTML is never injected into the page",
    "Exposed to the AI Assistant as tools, including a confirmation-gated send",
  ],
  navEntry: { label: "Gmail", path: "/dashboard/gmail" },
  // GMAIL_REFRESH_TOKEN is added later by the OAuth flow, not entered manually, so it's not listed here.
  requiredSecrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
  emits: ["gmail.connected", "gmail.disconnected", "gmail.email.labeled"],
  defaultEnabled: true,
};
