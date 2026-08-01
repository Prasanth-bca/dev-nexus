export const NOTES_COLLECTION = "notes_items";

export interface NoteDoc {
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  summary?: string;
  summaryGeneratedAt?: Date;
  /** Embedding vector for Semantic Search — never sent to the client, see NoteDTO. */
  embedding?: number[];
  embeddingUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Serialized shape used on the client — _id as a plain string, dates as ISO strings (matches fetch() JSON responses). Never carries the embedding vector. */
export interface NoteDTO extends Omit<NoteDoc, "createdAt" | "updatedAt" | "summaryGeneratedAt" | "embedding" | "embeddingUpdatedAt"> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  summaryGeneratedAt?: string;
}

export interface RelatedNote {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}
