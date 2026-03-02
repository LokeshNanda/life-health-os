/**
 * Data model per DATA_MODEL.md
 * All records are timestamped and immutable.
 */

export type DataCategory =
  | "medical_event"
  | "medication"
  | "lab_result"
  | "note"
  | "document"
  | "voice_transcript";

export interface HealthEvent {
  id: string;
  category: DataCategory;
  content: string;
  timestamp: string; // ISO 8601
  metadata?: Record<string, unknown>;
  /** Optional tags for filtering and chat context (e.g. "cardiologist", "2024 physical"). */
  tags?: string[];
}

export interface Summary {
  version: number;
  content: string;
  createdAt: string;
  sizeBefore: number;
  sizeAfter: number;
}

export interface MemoryStats {
  size: number;
  entries: number;
  lastSummarized: string | null;
  summaryVersion: number | null;
}

export interface CategoryBreakdown {
  category: DataCategory;
  count: number;
  size: number;
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatCitation {
  id: string;
  category: string;
  date: string;
}

/** Edit overlay for an event. Stored in user:{userId}:event_edits. */
export interface EventEdit {
  content?: string;
  category?: DataCategory;
  timestamp?: string;
  tags?: string[];
  editedAt: string; // ISO 8601, set by server
}

/** One message as stored in Redis (role + content + optional followUps/citations). */
export interface StoredChatMessage {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  citations?: ChatCitation[];
  createdAt: string;
}
