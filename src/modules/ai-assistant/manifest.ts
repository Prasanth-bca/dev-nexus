import type { ModuleManifest } from "@/lib/kernel/types";

export const manifest: ModuleManifest = {
  id: "ai-assistant",
  name: "AI Assistant",
  category: "ai",
  icon: "Sparkles",
  version: "0.1.0",
  description:
    "A provider-agnostic chat assistant that can act on your data through real tool calls, with an approval gate on anything destructive.",
  highlights: [
    "Works with Anthropic, OpenAI, Groq, or any OpenAI-compatible endpoint — one active at a time",
    "Genuine tool calling into Notes and Gmail, not prompt-stuffed context",
    "Conversation history persisted across sessions",
    "Per-tool confirmation gate that pauses execution until you approve",
  ],
  navEntry: { label: "AI Assistant", path: "/dashboard/ai-assistant" },
  // Which secret is required depends on which provider the user configures — not static,
  // so this is intentionally empty. Gating happens at the route level instead.
  requiredSecrets: [],
  emits: ["ai.message.sent", "notes.created", "notes.updated", "notes.deleted", "gmail.email.sent", "gmail.email.labeled"],
  defaultEnabled: true,
};
