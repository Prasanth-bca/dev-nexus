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
