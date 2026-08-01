import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "ai-assistant",
  name: "AI Assistant",
  category: "ai",
  icon: "Sparkles",
  version: "0.1.0",
  navEntry: { label: "AI Assistant", path: "/dashboard/ai-assistant" },
  // Which secret is required depends on which provider the user configures — not static,
  // so this is intentionally empty. Gating happens at the route level instead.
  requiredSecrets: [],
  emits: ["ai.message.sent", "notes.created", "notes.updated", "notes.deleted", "gmail.email.sent", "gmail.email.labeled"],
  defaultEnabled: true,
};
