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

/** Destructive or outbound-effect tools default to requiring confirmation unless overridden. */
export const DEFAULT_CONFIRM_REQUIRED = new Set(["delete_note", "send_email"]);
