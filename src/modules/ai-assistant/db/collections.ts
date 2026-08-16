export const PROVIDERS_COLLECTION = "ai_assistant_providers";
export const CONVERSATIONS_COLLECTION = "ai_assistant_conversations";
export const TOOL_SETTINGS_COLLECTION = "ai_assistant_tool_settings";

export type ProviderType = "anthropic" | "openai" | "groq" | "custom";

export interface ProviderDoc {
  provider: ProviderType;
  model: string;
  secretName: string;
  baseUrl?: string;
  active: boolean;
  updatedAt: Date;
}

export interface ProviderDTO {
  provider: ProviderType;
  model: string;
  baseUrl?: string;
  active: boolean;
  updatedAt: string;
}

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  groq: "Groq",
  custom: "Custom (OpenAI-compatible)",
};

export const PROVIDER_DEFAULT_MODELS: Record<ProviderType, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4.1",
  groq: "llama-3.3-70b-versatile",
  custom: "",
};

/** Generic, provider-agnostic persisted message shape — covers both plain turns and tool-call turns. */
export interface StoredMessage {
  role: "user" | "assistant" | "assistant_tool_call" | "tool_result";
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  /** The provider's original tool_calls[] element, when there was one — see Turn["assistant_tool_call"].raw
   *  in server/providers.ts for why (Gemini's thought_signature must round-trip verbatim). */
  toolCallRaw?: Record<string, unknown>;
  createdAt: Date;
}

export interface ConversationDoc {
  title: string;
  messages: StoredMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummaryDTO {
  id: string;
  title: string;
  updatedAt: string;
}

export interface MessageDTO {
  role: StoredMessage["role"];
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
}

export interface ConversationDTO extends ConversationSummaryDTO {
  messages: MessageDTO[];
}

export interface ToolSettingDoc {
  toolName: string;
  requiresConfirmation: boolean;
}

export interface ToolSettingDTO {
  name: string;
  description: string;
  requiresConfirmation: boolean;
}

/**
 * Destructive or outbound-effect tools default to requiring confirmation unless overridden.
 * `draft_email` is deliberately not here — drafting has no outbound effect, so gating it would
 * just add a pointless approval click before the user even sees the draft to review. `send_email`
 * (a direct, immediate send the AI can call without going through the draft-review flow) does
 * require confirmation, same as before — it's the one tool in this set that actually sends mail.
 *
 * `add_email_label`/`mark_email_read` are gated too: email bodies are attacker-controlled and
 * feed back into the model's context as tool results, so a malicious email can otherwise
 * instruct the model to mass-label or mark-as-read on its own — e.g. to hide evidence of
 * itself — with no chance for the user to notice. `list_unread_emails` stays ungated since it
 * has no side effect to approve; the injection risk it introduces is in what the model does
 * with what it reads, which is exactly what gating the tools below addresses.
 */
export const DEFAULT_CONFIRM_REQUIRED = new Set(["delete_note", "send_email", "add_email_label", "mark_email_read"]);
