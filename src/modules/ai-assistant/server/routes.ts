import { ObjectId } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { setSecret, deleteSecret } from "@/lib/kernel/secrets";
import {
  PROVIDERS_COLLECTION,
  PROVIDER_LABELS,
  CONVERSATIONS_COLLECTION,
  TOOL_SETTINGS_COLLECTION,
  DEFAULT_CONFIRM_REQUIRED,
  type ProviderDoc,
  type ProviderType,
  type ConversationDoc,
  type StoredMessage,
  type ToolSettingDoc,
} from "../db/collections";
import { callProvider, type Turn, type ToolDef } from "./providers";
import { NOTE_TOOLS, runNoteTool } from "./tools";
import { GMAIL_TOOLS, runGmailTool } from "./gmailTools";

const KNOWN_PROVIDERS: ProviderType[] = ["anthropic", "openai", "groq", "custom"];
const MAX_TOOL_ITERATIONS = 5;

const ALL_TOOLS: ToolDef[] = [...NOTE_TOOLS, ...GMAIL_TOOLS];
const NOTE_TOOL_NAMES = new Set(NOTE_TOOLS.map((t) => t.name));

const SYSTEM_PROMPT =
  "You are the Dev Nexus AI Assistant, built into the user's personal developer platform. " +
  "You have tools to search/create/update/delete the user's notes, and to list unread Gmail " +
  "messages / add labels / mark them read / draft or send email (if Gmail is connected — if a " +
  "Gmail tool errors saying it's not connected or lacks permission, tell the user to (re)connect " +
  "it at /dashboard/gmail). Use tools whenever they would help answer the question or complete " +
  "the request. Some tools require the user's explicit approval before they run — if one is " +
  "declined, acknowledge that and don't retry it without being asked again. Be concise and " +
  "practical. Only delete a note when the user has clearly asked for that specific note to be " +
  "removed. " +
  "For email, there are two tools with different purposes — pick deliberately: " +
  "draft_email composes or revises a draft the user reviews, edits, and sends themselves (no " +
  "email goes out from this tool at all); send_email sends immediately once approved, no review " +
  "step. Use draft_email whenever the user wants to compose, write, or review something, or " +
  "hasn't been explicit that it should go out right away — it's the safer default. Use send_email " +
  "only when the user has clearly and specifically asked you to send an email now, with a " +
  "recipient, subject, and body already settled — never send speculatively or as an example, and " +
  "never treat 'draft an email' as a request to send one. Both tools require the user's approval " +
  "before anything happens: send_email pauses for an explicit Approve/Deny; draft_email always " +
  "renders as an editable card that only sends when the user clicks Send on it themselves. Never " +
  "claim an email was sent unless send_email actually ran and succeeded. If the user asks you to " +
  "change the most recent draft (tone, length, add a recipient, etc.), call draft_email again " +
  "carrying forward every field they didn't ask to change, rather than starting over.";

async function runTool(ctx: ModuleContext, name: string, args: Record<string, unknown>): Promise<string> {
  if (NOTE_TOOL_NAMES.has(name)) return runNoteTool(ctx, name, args);
  return runGmailTool(ctx, name, args);
}

function secretNameFor(provider: ProviderType): string {
  return `AI_PROVIDER_${provider.toUpperCase()}`;
}

function toProviderDTO(doc: ProviderDoc) {
  return { provider: doc.provider, model: doc.model, baseUrl: doc.baseUrl, active: doc.active, updatedAt: doc.updatedAt.toISOString() };
}

function storedToTurns(messages: StoredMessage[]): Turn[] {
  return messages.map((m): Turn => {
    switch (m.role) {
      case "user":
        return { role: "user", content: m.content ?? "" };
      case "assistant":
        return { role: "assistant", content: m.content ?? "" };
      case "assistant_tool_call":
        return { role: "assistant_tool_call", id: m.toolCallId ?? "", name: m.toolName ?? "", arguments: m.toolArguments ?? {} };
      case "tool_result":
        return { role: "tool_result", id: m.toolCallId ?? "", content: m.content ?? "" };
    }
  });
}

function turnToStored(turn: Turn): StoredMessage {
  const createdAt = new Date();
  switch (turn.role) {
    case "user":
      return { role: "user", content: turn.content, createdAt };
    case "assistant":
      return { role: "assistant", content: turn.content, createdAt };
    case "assistant_tool_call":
      return { role: "assistant_tool_call", toolCallId: turn.id, toolName: turn.name, toolArguments: turn.arguments, createdAt };
    case "tool_result":
      return { role: "tool_result", toolCallId: turn.id, content: turn.content, createdAt };
  }
}

function toMessageDTO(m: StoredMessage) {
  return { role: m.role, content: m.content, toolCallId: m.toolCallId, toolName: m.toolName, toolArguments: m.toolArguments };
}

/** The pending tool call is always the *last* stored message when the loop paused for confirmation. */
function findPendingToolCall(messages: StoredMessage[]): StoredMessage | null {
  const last = messages[messages.length - 1];
  return last && last.role === "assistant_tool_call" ? last : null;
}

type LoopResult =
  | { status: "text"; text: string; turns: Turn[] }
  | { status: "confirm"; turns: Turn[]; call: { id: string; name: string; arguments: Record<string, unknown> } };

/**
 * Runs the tool-call loop starting from `baseHistory` (already includes whatever new turn kicked
 * this off — a user message, or a tool_result from a resolved confirmation). Pauses and returns
 * `status: "confirm"` the moment the model requests a tool marked as requiring confirmation,
 * *before* executing it — the caller persists that pause point and a later /chat/confirm call
 * resumes the loop from there.
 */
async function runAssistantLoop(
  ctx: ModuleContext,
  provider: ProviderDoc,
  apiKey: string,
  baseHistory: Turn[],
  confirmRequired: (toolName: string) => boolean
): Promise<LoopResult> {
  const history = [...baseHistory];
  const turns: Turn[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const result = await callProvider(provider.provider, {
      apiKey,
      model: provider.model,
      baseUrl: provider.baseUrl,
      systemPrompt: SYSTEM_PROMPT,
      history,
      tools: ALL_TOOLS,
    });

    if (result.type === "text") {
      const turn: Turn = { role: "assistant", content: result.text };
      history.push(turn);
      turns.push(turn);
      return { status: "text", text: result.text, turns };
    }

    const callTurn: Turn = { role: "assistant_tool_call", id: result.id, name: result.name, arguments: result.arguments };
    history.push(callTurn);
    turns.push(callTurn);

    if (confirmRequired(result.name)) {
      return { status: "confirm", turns, call: { id: result.id, name: result.name, arguments: result.arguments } };
    }

    const toolResult = await runTool(ctx, result.name, result.arguments);
    const resultTurn: Turn = { role: "tool_result", id: result.id, content: toolResult };
    history.push(resultTurn);
    turns.push(resultTurn);
  }

  const fallbackText = "I wasn't able to finish that within the tool-call limit — try rephrasing or breaking it into smaller steps.";
  const turn: Turn = { role: "assistant", content: fallbackText };
  turns.push(turn);
  return { status: "text", text: fallbackText, turns };
}

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  const providers = () => ctx.db.collection<ProviderDoc>(PROVIDERS_COLLECTION);
  const conversations = () => ctx.db.collection<ConversationDoc>(CONVERSATIONS_COLLECTION);
  const toolSettings = () => ctx.db.collection<ToolSettingDoc>(TOOL_SETTINGS_COLLECTION);

  async function confirmRequiredFn(): Promise<(toolName: string) => boolean> {
    const overrides = await toolSettings().find().toArray();
    const overrideMap = new Map(overrides.map((o) => [o.toolName, o.requiresConfirmation]));
    return (toolName: string) => overrideMap.get(toolName) ?? DEFAULT_CONFIRM_REQUIRED.has(toolName);
  }

  async function persistAndRespond(convId: ObjectId, precedingTurns: Turn[], loopResult: LoopResult, isFirstMessage: boolean, firstMessageTitle: string) {
    const allTurns = [...precedingTurns, ...loopResult.turns];
    await conversations().updateOne(
      { _id: convId },
      {
        $push: { messages: { $each: allTurns.map(turnToStored) } },
        $set: { updatedAt: new Date(), ...(isFirstMessage ? { title: firstMessageTitle.slice(0, 60) } : {}) },
      }
    );

    const messages = allTurns.map((t) => toMessageDTO(turnToStored(t)));
    if (loopResult.status === "confirm") {
      return Response.json({ status: "confirm", toolCall: loopResult.call, messages });
    }
    return Response.json({ status: "done", reply: loopResult.text, messages });
  }

  return [
    // ---------- Providers ----------
    {
      method: "GET",
      path: "/providers",
      handler: async () => Response.json((await providers().find().sort({ provider: 1 }).toArray()).map(toProviderDTO)),
    },
    {
      method: "POST",
      path: "/providers",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const provider = body.provider as ProviderType;
        const model = typeof body.model === "string" ? body.model.trim() : "";
        const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
        const baseUrl = typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl.trim() : undefined;

        if (!KNOWN_PROVIDERS.includes(provider)) {
          return Response.json({ error: `Provider must be one of: ${KNOWN_PROVIDERS.join(", ")}` }, { status: 400 });
        }
        if (!model) return Response.json({ error: "Model is required." }, { status: 400 });
        if (!apiKey) return Response.json({ error: "API key is required." }, { status: 400 });
        if (provider === "custom" && !baseUrl) {
          return Response.json({ error: "Custom provider requires a base URL." }, { status: 400 });
        }

        const secretName = secretNameFor(provider);
        await setSecret(secretName, apiKey);

        const existingActive = await providers().findOne({ active: true });
        await providers().updateOne(
          { provider },
          { $set: { provider, model, secretName, baseUrl, updatedAt: new Date() }, $setOnInsert: { active: !existingActive } },
          { upsert: true }
        );

        return Response.json({ ok: true }, { status: 201 });
      },
    },
    {
      method: "POST",
      path: "/providers/:provider/activate",
      handler: async (_req, params) => {
        const provider = params.provider as ProviderType;
        const exists = await providers().findOne({ provider });
        if (!exists) return Response.json({ error: "Provider is not configured yet." }, { status: 404 });

        await providers().updateMany({}, { $set: { active: false } });
        await providers().updateOne({ provider }, { $set: { active: true } });
        return Response.json({ ok: true });
      },
    },
    {
      method: "DELETE",
      path: "/providers/:provider",
      handler: async (_req, params) => {
        const provider = params.provider as ProviderType;
        await deleteSecret(secretNameFor(provider));
        await providers().deleteOne({ provider });
        return Response.json({ ok: true });
      },
    },

    // ---------- Tool settings ----------
    {
      method: "GET",
      path: "/tool-settings",
      handler: async () => {
        const overrides = await toolSettings().find().toArray();
        const overrideMap = new Map(overrides.map((o) => [o.toolName, o.requiresConfirmation]));
        return Response.json(
          ALL_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            requiresConfirmation: overrideMap.get(t.name) ?? DEFAULT_CONFIRM_REQUIRED.has(t.name),
          }))
        );
      },
    },
    {
      method: "POST",
      path: "/tool-settings",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const toolName = typeof body.toolName === "string" ? body.toolName : "";
        const requiresConfirmation = Boolean(body.requiresConfirmation);

        if (!ALL_TOOLS.some((t) => t.name === toolName)) {
          return Response.json({ error: "Unknown tool." }, { status: 400 });
        }

        await toolSettings().updateOne({ toolName }, { $set: { toolName, requiresConfirmation } }, { upsert: true });
        return Response.json({ ok: true });
      },
    },

    // ---------- Conversations ----------
    {
      method: "GET",
      path: "/conversations",
      handler: async () => {
        const docs = await conversations().find().sort({ updatedAt: -1 }).toArray();
        return Response.json(docs.map((d) => ({ id: d._id.toString(), title: d.title, updatedAt: d.updatedAt.toISOString() })));
      },
    },
    {
      method: "POST",
      path: "/conversations",
      handler: async () => {
        const now = new Date();
        const result = await conversations().insertOne({ title: "New conversation", messages: [], createdAt: now, updatedAt: now });
        return Response.json({ id: result.insertedId.toString(), title: "New conversation", updatedAt: now.toISOString() }, { status: 201 });
      },
    },
    {
      method: "GET",
      path: "/conversations/:id",
      handler: async (_req, params) => {
        if (!ObjectId.isValid(params.id)) return Response.json({ error: "Invalid id" }, { status: 400 });
        const doc = await conversations().findOne({ _id: new ObjectId(params.id) });
        if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json({
          id: doc._id.toString(),
          title: doc.title,
          updatedAt: doc.updatedAt.toISOString(),
          messages: doc.messages.map(toMessageDTO),
        });
      },
    },
    {
      method: "PUT",
      path: "/conversations/:id",
      handler: async (req, params) => {
        if (!ObjectId.isValid(params.id)) return Response.json({ error: "Invalid id" }, { status: 400 });
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const title = typeof body.title === "string" ? body.title.trim() : "";
        if (!title) return Response.json({ error: "title is required" }, { status: 400 });

        const result = await conversations().findOneAndUpdate(
          { _id: new ObjectId(params.id) },
          { $set: { title } },
          { returnDocument: "after" }
        );
        if (!result) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json({ id: result._id.toString(), title: result.title, updatedAt: result.updatedAt.toISOString() });
      },
    },
    {
      method: "DELETE",
      path: "/conversations/:id",
      handler: async (_req, params) => {
        if (!ObjectId.isValid(params.id)) return Response.json({ error: "Invalid id" }, { status: 400 });
        await conversations().deleteOne({ _id: new ObjectId(params.id) });
        return Response.json({ ok: true });
      },
    },
    {
      // Persists the user's edits to one specific draft_email tool call in place — used both
      // by the draft card's "Save" action and (with `sent: true`) right after a successful
      // send, so reloading the conversation shows exactly what was actually sent rather than
      // the AI's original, possibly-since-edited draft.
      method: "PUT",
      path: "/conversations/:id/draft/:toolCallId",
      handler: async (req, params) => {
        if (!ObjectId.isValid(params.id)) return Response.json({ error: "Invalid conversation id." }, { status: 400 });
        const convId = new ObjectId(params.id);
        const conversation = await conversations().findOne({ _id: convId });
        if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

        const target = conversation.messages.find(
          (m) => m.role === "assistant_tool_call" && m.toolCallId === params.toolCallId && m.toolName === "draft_email"
        );
        if (!target) return Response.json({ error: "Draft not found." }, { status: 404 });

        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const patch: Record<string, unknown> = {};
        for (const field of ["to", "cc", "bcc", "subject", "body"]) {
          if (typeof body[field] === "string") patch[field] = body[field];
        }
        if (typeof body.sent === "boolean") patch.sent = body.sent;

        const merged = { ...target.toolArguments, ...patch };
        await conversations().updateOne(
          { _id: convId },
          { $set: { "messages.$[elem].toolArguments": merged, updatedAt: new Date() } },
          { arrayFilters: [{ "elem.toolCallId": params.toolCallId, "elem.role": "assistant_tool_call" }] }
        );
        return Response.json({ ok: true, toolArguments: merged });
      },
    },

    // ---------- Chat ----------
    {
      method: "POST",
      path: "/chat",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
        const userMessage = typeof body.message === "string" ? body.message.trim() : "";

        if (!ObjectId.isValid(conversationId)) return Response.json({ error: "Invalid conversation id." }, { status: 400 });
        if (!userMessage) return Response.json({ error: "message is required." }, { status: 400 });

        const convId = new ObjectId(conversationId);
        const conversation = await conversations().findOne({ _id: convId });
        if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

        if (findPendingToolCall(conversation.messages)) {
          return Response.json(
            { error: "This conversation has an action awaiting your approval — approve or deny it before sending a new message." },
            { status: 409 }
          );
        }

        const active = await providers().findOne({ active: true });
        if (!active) {
          return Response.json(
            { error: `No active AI provider configured. Add one below (${Object.values(PROVIDER_LABELS).join(", ")}).` },
            { status: 400 }
          );
        }

        try {
          const apiKey = await ctx.secrets.get(active.secretName);
          const confirmRequired = await confirmRequiredFn();

          const userTurn: Turn = { role: "user", content: userMessage };
          const baseHistory = [...storedToTurns(conversation.messages), userTurn];

          const loopResult = await runAssistantLoop(ctx, active, apiKey, baseHistory, confirmRequired);
          const isFirstMessage = conversation.messages.length === 0;

          ctx.events.emit("ai.message.sent", { provider: active.provider });
          return await persistAndRespond(convId, [userTurn], loopResult, isFirstMessage, userMessage);
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "AI request failed." }, { status: 502 });
        }
      },
    },
    {
      method: "POST",
      path: "/chat/confirm",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
        const toolCallId = typeof body.toolCallId === "string" ? body.toolCallId : "";
        const approve = Boolean(body.approve);

        if (!ObjectId.isValid(conversationId)) return Response.json({ error: "Invalid conversation id." }, { status: 400 });

        const convId = new ObjectId(conversationId);
        const conversation = await conversations().findOne({ _id: convId });
        if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

        const pending = findPendingToolCall(conversation.messages);
        if (!pending || pending.toolCallId !== toolCallId) {
          return Response.json({ error: "No matching action is awaiting approval." }, { status: 409 });
        }

        const active = await providers().findOne({ active: true });
        if (!active) {
          return Response.json({ error: "No active AI provider configured." }, { status: 400 });
        }

        try {
          const apiKey = await ctx.secrets.get(active.secretName);
          const confirmRequired = await confirmRequiredFn();

          const resultContent = approve
            ? await runTool(ctx, pending.toolName ?? "", pending.toolArguments ?? {})
            : JSON.stringify({ declined: true, message: "The user declined to run this action." });

          const resultTurn: Turn = { role: "tool_result", id: toolCallId, content: resultContent };
          const baseHistory = [...storedToTurns(conversation.messages), resultTurn];

          const loopResult = await runAssistantLoop(ctx, active, apiKey, baseHistory, confirmRequired);

          ctx.events.emit("ai.message.sent", { provider: active.provider });
          return await persistAndRespond(convId, [resultTurn], loopResult, false, "");
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "AI request failed." }, { status: 502 });
        }
      },
    },
  ];
}
