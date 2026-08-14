import type { ProviderType } from "../db/collections";
import { EXTERNAL_FETCH_TIMEOUT_MS } from "@/lib/fetch-timeout";

export interface ToolDef {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

/**
 * Provider-agnostic turn history. Only one tool call per assistant turn is supported
 * (no parallel tool calls) — a deliberate v1 simplification that covers the vast majority
 * of real usage and keeps translating to/from each provider's wire format tractable.
 */
export type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | {
      role: "assistant_tool_call";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
      /**
       * The exact tool_calls[] element as returned by an OpenAI-compatible provider, kept
       * verbatim (not just {id, name, arguments}) so provider-specific extra fields survive
       * the round trip when this turn is echoed back in a later request. Concretely: Gemini's
       * "thinking" models (via their OpenAI-compatible endpoint) attach an
       * extra_content.google.thought_signature that MUST be sent back unmodified on the next
       * turn, or the API rejects the request with "Function call is missing a
       * thought_signature" — found live via a real chat error. Anthropic/plain OpenAI/Groq
       * don't need this, so it's undefined for those.
       */
      raw?: Record<string, unknown>;
    }
  | { role: "tool_result"; id: string; content: string };

export type ProviderResult =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; arguments: Record<string, unknown>; raw?: Record<string, unknown> };

interface CallInput {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  history: Turn[];
  tools: ToolDef[];
}

// ---------- Anthropic ----------

function buildAnthropicMessages(history: Turn[]) {
  return history.map((turn) => {
    switch (turn.role) {
      case "user":
        return { role: "user", content: turn.content };
      case "assistant":
        return { role: "assistant", content: turn.content };
      case "assistant_tool_call":
        return { role: "assistant", content: [{ type: "tool_use", id: turn.id, name: turn.name, input: turn.arguments }] };
      case "tool_result":
        return { role: "user", content: [{ type: "tool_result", tool_use_id: turn.id, content: turn.content }] };
    }
  });
}

async function callAnthropic({ apiKey, model, systemPrompt, history, tools }: CallInput): Promise<ProviderResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: buildAnthropicMessages(history),
      tools: tools.length ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) : undefined,
    }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> =
    data.content ?? [];
  const toolUse = content.find((b) => b.type === "tool_use");
  if (toolUse) {
    return { type: "tool_call", id: toolUse.id!, name: toolUse.name!, arguments: toolUse.input ?? {} };
  }
  return { type: "text", text: content.map((b) => b.text ?? "").join("") };
}

// ---------- OpenAI-compatible (OpenAI, Groq, and most self-hosted gateways) ----------

function buildOpenAiMessages(systemPrompt: string, history: Turn[]) {
  const messages: Array<Record<string, unknown>> = [{ role: "system", content: systemPrompt }];
  for (const turn of history) {
    switch (turn.role) {
      case "user":
        messages.push({ role: "user", content: turn.content });
        break;
      case "assistant":
        messages.push({ role: "assistant", content: turn.content });
        break;
      case "assistant_tool_call":
        // Echo the exact tool_calls[] element the provider returned when we have it (turn.raw),
        // rather than reconstructing a minimal {id, function} — that's what preserves Gemini's
        // extra_content.google.thought_signature across the round trip. Falls back to a
        // reconstructed one for turns that never had a raw form (e.g. Groq's malformed-tool-call
        // recovery path below, which invents a call that was never actually returned this way).
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [
            turn.raw ?? { id: turn.id, type: "function", function: { name: turn.name, arguments: JSON.stringify(turn.arguments) } },
          ],
        });
        break;
      case "tool_result":
        messages.push({ role: "tool", tool_call_id: turn.id, content: turn.content });
        break;
    }
  }
  return messages;
}

/** `& Record<string, unknown>` on the tool_calls element — not just {id, function} — so provider-
 *  specific extra fields (e.g. Gemini's extra_content) are typed as present and survive being
 *  captured into ProviderResult.raw further down, instead of being stripped by the type. */
type OpenAiToolCall = { id: string; function: { name: string; arguments: string } } & Record<string, unknown>;

type OpenAiRequestResult =
  | { ok: true; data: { choices?: Array<{ message?: { content?: string; tool_calls?: OpenAiToolCall[] } }> } }
  | { ok: false; status: number; bodyText: string; code?: string; failedGeneration?: string };

async function requestOpenAi(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Turn[],
  tools: ToolDef[]
): Promise<OpenAiRequestResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildOpenAiMessages(systemPrompt, history),
      tools: tools.length
        ? tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }))
        : undefined,
    }),
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });

  if (res.ok) return { ok: true, data: await res.json() };

  const bodyText = await res.text();
  let code: string | undefined;
  let failedGeneration: string | undefined;
  try {
    const parsed = JSON.parse(bodyText);
    code = parsed?.error?.code;
    failedGeneration = parsed?.error?.failed_generation;
  } catch {
    // response wasn't JSON — leave code/failedGeneration undefined
  }
  return { ok: false, status: res.status, bodyText, code, failedGeneration };
}

/**
 * Groq's Llama models occasionally write a tool call as inline pseudo-XML text —
 * `<function=name{"arg":"value"}</function>` — instead of the API's structured `tool_calls`
 * field, which gets the whole response rejected as `tool_use_failed`. Rather than discard a
 * generation that already contains a perfectly identifiable, well-formed call and just retry
 * blind, parse it directly out of `error.failed_generation` and use it as-is.
 */
function recoverToolCallFromFailedGeneration(
  failedGeneration: string | undefined,
  tools: ToolDef[]
): { name: string; arguments: Record<string, unknown> } | null {
  if (!failedGeneration) return null;
  const match = /<function=([\w.-]+)\s*(\{[\s\S]*\})\s*<\/function>/.exec(failedGeneration);
  if (!match) return null;
  const [, name, argsJson] = match;
  if (!tools.some((t) => t.name === name)) return null;
  try {
    const args = JSON.parse(argsJson);
    return args && typeof args === "object" ? { name, arguments: args } : null;
  } catch {
    return null;
  }
}

function toProviderResult(message?: { content?: string; tool_calls?: OpenAiToolCall[] }): ProviderResult {
  const toolCall = message?.tool_calls?.[0];
  if (toolCall) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      // leave args empty if the model produced malformed JSON — the tool handler will just see no args
    }
    // raw: toolCall keeps the whole element (id/type/function/any extra provider fields) so it
    // can be echoed back verbatim later — see the Turn["assistant_tool_call"].raw doc comment.
    return { type: "tool_call", id: toolCall.id, name: toolCall.function.name, arguments: args, raw: toolCall };
  }
  return { type: "text", text: message?.content ?? "" };
}

async function callOpenAiCompatible(baseUrl: string, { apiKey, model, systemPrompt, history, tools }: CallInput): Promise<ProviderResult> {
  let result = await requestOpenAi(baseUrl, apiKey, model, systemPrompt, history, tools);

  // Some models (seen with Groq-hosted Llama models) occasionally try to emit a tool call as
  // free-form text instead of a structured one, and the API rejects the whole response for it.
  if (!result.ok && result.code === "tool_use_failed") {
    const recovered = recoverToolCallFromFailedGeneration(result.failedGeneration, tools);
    if (recovered) {
      return { type: "tool_call", id: crypto.randomUUID(), name: recovered.name, arguments: recovered.arguments };
    }
    // Couldn't recover a well-formed call out of it — generation isn't deterministic, so
    // retrying the identical request once often just succeeds outright.
    result = await requestOpenAi(baseUrl, apiKey, model, systemPrompt, history, tools);
  }

  // Still failing the same way — try recovery again, then fall back to answering without tools
  // so the user gets a plain reply (e.g. "I can't do that") instead of a raw provider error.
  if (!result.ok && result.code === "tool_use_failed") {
    const recovered = recoverToolCallFromFailedGeneration(result.failedGeneration, tools);
    if (recovered) {
      return { type: "tool_call", id: crypto.randomUUID(), name: recovered.name, arguments: recovered.arguments };
    }
    const fallback = await requestOpenAi(baseUrl, apiKey, model, systemPrompt, history, []);
    if (fallback.ok) {
      const message = fallback.data.choices?.[0]?.message;
      return { type: "text", text: message?.content || "I wasn't able to complete that — could you rephrase the request?" };
    }
    result = fallback;
  }

  if (!result.ok) {
    throw new Error(`AI provider request failed (${result.status}): ${result.bodyText.slice(0, 300)}`);
  }

  return toProviderResult(result.data.choices?.[0]?.message);
}

export async function callProvider(provider: ProviderType, input: CallInput): Promise<ProviderResult> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(input);
    case "openai":
      return callOpenAiCompatible("https://api.openai.com/v1", input);
    case "groq":
      return callOpenAiCompatible("https://api.groq.com/openai/v1", input);
    case "custom":
      if (!input.baseUrl) throw new Error("Custom provider requires a base URL.");
      return callOpenAiCompatible(input.baseUrl, input);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
