export type EventMeta = { type: string; moduleId: string; timestamp: number };
export type EventHandler = (payload: unknown, meta: EventMeta) => void;

export interface EventBus {
  /** Subscribe to an event type. "*" matches everything, "n8n.*" matches one segment after "n8n.". Returns an unsubscribe function. */
  on(pattern: string, handler: EventHandler): () => void;
  emit(type: string, payload?: unknown): void;
}

function patternToRegex(pattern: string): RegExp {
  if (pattern === "*") return /.*/;
  const escaped = pattern
    .split(".")
    .map((seg) => (seg === "*" ? "[^.]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("\\.");
  return new RegExp(`^${escaped}$`);
}

interface Subscription {
  regex: RegExp;
  handler: EventHandler;
}

/** Process-wide in-process pub/sub. Modules never import each other directly — they coordinate through this bus. */
export function createEventBus() {
  const subscriptions: Subscription[] = [];

  function on(pattern: string, handler: EventHandler) {
    const sub: Subscription = { regex: patternToRegex(pattern), handler };
    subscriptions.push(sub);
    return () => {
      const idx = subscriptions.indexOf(sub);
      if (idx >= 0) subscriptions.splice(idx, 1);
    };
  }

  function emitFrom(moduleId: string, type: string, payload?: unknown) {
    const meta: EventMeta = { type, moduleId, timestamp: Date.now() };
    for (const sub of subscriptions) {
      if (sub.regex.test(type)) {
        try {
          sub.handler(payload, meta);
        } catch (err) {
          console.error(`[events] handler for "${type}" threw`, err);
        }
      }
    }
  }

  /** Scopes emit() to a moduleId so subscribers always know who published an event. */
  function scopedTo(moduleId: string): EventBus {
    return {
      on,
      emit: (type, payload) => emitFrom(moduleId, type, payload),
    };
  }

  return { on, emitFrom, scopedTo };
}

declare global {
  var _devNexusEventBus: ReturnType<typeof createEventBus> | undefined;
}

export function getSharedEventBus() {
  if (!global._devNexusEventBus) {
    global._devNexusEventBus = createEventBus();
  }
  return global._devNexusEventBus;
}
