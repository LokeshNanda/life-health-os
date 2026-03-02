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

/** One message as stored in Redis (role + content + optional followUps/citations). */
export interface StoredChatMessage {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  citations?: ChatCitation[];
  createdAt: string;
}
