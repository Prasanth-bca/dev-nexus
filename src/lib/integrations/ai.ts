import { getDb } from "@/lib/kernel/db";
import { getSecret } from "@/lib/kernel/secrets";

/**
 * Single-turn text completion using whichever AI provider is active in the AI Assistant module.
 * Reads shared kernel state (Mongo + Secret Manager) directly rather than importing
 * ai-assistant's code — same "shared lib, not cross-module import" pattern as
 * src/lib/integrations/gmail.ts. Deliberately independent from ai-assistant/server/providers.ts's
 * tool-calling loop: this only needs a single prompt in, text out, so a small amount of
 * duplicated fetch logic here is clearer than forcing both call sites through one abstraction.
 */

const PROVIDERS_COLLECTION = "ai_assistant_providers";

interface ActiveProvider {
  provider: "anthropic" | "openai" | "groq" | "custom";
  model: string;
  secretName: string;
  baseUrl?: string;
}

async function getActiveProvider(): Promise<ActiveProvider | null> {
  const db = await getDb();
  const doc = await db.collection<ActiveProvider & { active: boolean }>(PROVIDERS_COLLECTION).findOne({ active: true });
  return doc ? { provider: doc.provider, model: doc.model, secretName: doc.secretName, baseUrl: doc.baseUrl } : null;
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content: Array<{ text?: string }> = data.content ?? [];
  return content.map((b) => b.text ?? "").join("");
}

async function callOpenAiCompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`AI provider request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function completeText(systemPrompt: string, userPrompt: string): Promise<string> {
  const active = await getActiveProvider();
  if (!active) throw new Error("No active AI provider configured. Set one up under AI Assistant → Providers.");
  const apiKey = await getSecret(active.secretName);

  switch (active.provider) {
    case "anthropic":
      return callAnthropic(apiKey, active.model, systemPrompt, userPrompt);
    case "openai":
      return callOpenAiCompatible("https://api.openai.com/v1", apiKey, active.model, systemPrompt, userPrompt);
    case "groq":
      return callOpenAiCompatible("https://api.groq.com/openai/v1", apiKey, active.model, systemPrompt, userPrompt);
    case "custom":
      if (!active.baseUrl) throw new Error("Custom provider has no base URL configured.");
      return callOpenAiCompatible(active.baseUrl, apiKey, active.model, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${active.provider}`);
  }
}
