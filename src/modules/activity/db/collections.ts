export const ACTIVITY_COLLECTION = "activity_log";

/** Only these event types get persisted — the shared event bus carries a lot of routine traffic
 * (every chat turn, every mark-as-read) that would make a timeline noisy rather than useful. */
export const TRACKED_EVENT_TYPES = new Set([
  "notes.created",
  "notes.deleted",
  "file-vault.uploaded",
  "file-vault.deleted",
  "gmail.email.sent",
  "gmail.email.labeled",
  "gmail.connected",
  "gmail.disconnected",
  "github.connected",
  "github.disconnected",
]);

export interface ActivityDoc {
  type: string;
  moduleId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface ActivityDTO {
  id: string;
  type: string;
  moduleId: string;
  summary: string;
  href?: string;
  timestamp: string;
}

function actor(payload: Record<string, unknown>): string {
  return payload.source === "ai-assistant" ? "The AI assistant" : "You";
}

/** Turns a raw {type, payload} event into a human-readable timeline line + optional deep link. */
export function describeActivity(type: string, payload: Record<string, unknown>): { summary: string; href?: string } {
  switch (type) {
    case "notes.created": {
      const title = typeof payload.title === "string" && payload.title ? `"${payload.title}"` : "a note";
      return { summary: `${actor(payload)} created ${title}`, href: payload.id ? `/dashboard/notes?open=${payload.id}` : undefined };
    }
    case "notes.deleted": {
      const title = typeof payload.title === "string" && payload.title ? `"${payload.title}"` : "a note";
      return { summary: `${actor(payload)} deleted ${title}` };
    }
    case "file-vault.uploaded": {
      const name = typeof payload.filename === "string" && payload.filename ? payload.filename : "a file";
      return { summary: `Uploaded ${name}`, href: payload.id ? `/dashboard/file-vault?open=${payload.id}` : undefined };
    }
    case "file-vault.deleted": {
      const name = typeof payload.filename === "string" && payload.filename ? payload.filename : "a file";
      return { summary: `Deleted ${name}` };
    }
    case "gmail.email.sent": {
      const to = typeof payload.to === "string" && payload.to ? ` to ${payload.to}` : "";
      return { summary: `${actor(payload)} sent an email${to}` };
    }
    case "gmail.email.labeled": {
      const label = typeof payload.label === "string" && payload.label ? `"${payload.label}"` : "a label";
      return { summary: `${actor(payload)} applied ${label} to an email` };
    }
    case "gmail.connected":
      return { summary: "Connected Gmail" };
    case "gmail.disconnected":
      return { summary: "Disconnected Gmail" };
    case "github.connected":
      return { summary: "Connected GitHub" };
    case "github.disconnected":
      return { summary: "Disconnected GitHub" };
    default:
      return { summary: type };
  }
}

export function toDTO(id: string, doc: ActivityDoc): ActivityDTO {
  const { summary, href } = describeActivity(doc.type, doc.payload);
  return { id, type: doc.type, moduleId: doc.moduleId, summary, href, timestamp: doc.timestamp.toISOString() };
}
