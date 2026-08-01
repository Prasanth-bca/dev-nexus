export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface EmailDetail extends EmailSummary {
  to: string;
  body: string;
}

/** Mirrors `InboxFilter` in `@/lib/integrations/gmail` — duplicated here so client
 *  components never import from a module that reads secrets on the server. */
export type InboxFilter = "today-unread" | "unread" | "today" | "all";
