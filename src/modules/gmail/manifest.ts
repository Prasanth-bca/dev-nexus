import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "gmail",
  name: "Gmail",
  category: "integration",
  icon: "Mail",
  version: "0.1.0",
  navEntry: { label: "Gmail", path: "/dashboard/gmail" },
  // GMAIL_REFRESH_TOKEN is added later by the OAuth flow, not entered manually, so it's not listed here.
  requiredSecrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
  emits: ["gmail.connected", "gmail.disconnected", "gmail.email.labeled"],
  defaultEnabled: true,
};
