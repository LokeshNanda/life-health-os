/**
 * Redis key schema per REDIS_SCHEMA.md
 * user:{userId}:events - Redis Stream
 * user:{userId}:ai_context - Redis String / JSON
 * user:{userId}:summary:{version} - Redis JSON
 * user:{userId}:meta - Redis Hash
 * user:{userId}:chat_sessions - ZSET (score = updatedAt ms, member = sessionId)
 * user:{userId}:chat_session:{sessionId} - Hash (title, createdAt, updatedAt)
 * user:{userId}:chat_session:{sessionId}:messages - List (JSON messages, chronological)
 */

export const keys = {
  events: (userId: string) => `user:${userId}:events`,
  aiContext: (userId: string) => `user:${userId}:ai_context`,
  summary: (userId: string, version: number) => `user:${userId}:summary:${version}`,
  meta: (userId: string) => `user:${userId}:meta`,
  summaryVersions: (userId: string) => `user:${userId}:summary_versions`,
  deleted: (userId: string) => `user:${userId}:deleted`,
  eventEdits: (userId: string) => `user:${userId}:event_edits`,
  chatSessionsZset: (userId: string) => `user:${userId}:chat_sessions`,
  chatSessionMeta: (userId: string, sessionId: string) =>
    `user:${userId}:chat_session:${sessionId}`,
  chatSessionMessages: (userId: string, sessionId: string) =>
    `user:${userId}:chat_session:${sessionId}:messages`,
} as const;
