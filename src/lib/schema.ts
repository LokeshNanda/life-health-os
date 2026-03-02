/**
 * Redis key schema per REDIS_SCHEMA.md
 * user:{userId}:events - Redis Stream
 * user:{userId}:ai_context - Redis String / JSON
 * user:{userId}:summary:{version} - Redis JSON
 * user:{userId}:meta - Redis Hash
 * user:{userId}:chat_sessions - ZSET (score = updatedAt ms, member = sessionId)
 * user:{userId}:chat_session:{sessionId} - Hash (title, createdAt, updatedAt)
 * user:{userId}:chat_session:{sessionId}:messages - List (JSON messages, chronological)
 * user:{userId}:profile - Redis String (JSON) - user profile for personalization
 */

export const keys = {
  events: (userId: string) => `user:${userId}:events`,
  aiContext: (userId: string) => `user:${userId}:ai_context`,
  summary: (userId: string, version: number) => `user:${userId}:summary:${version}`,
  meta: (userId: string) => `user:${userId}:meta`,
  summaryVersions: (userId: string) => `user:${userId}:summary_versions`,
  /** List of summary version numbers (newest first), for history */
  summaryVersionList: (userId: string) => `user:${userId}:summary_version_list`,
  deleted: (userId: string) => `user:${userId}:deleted`,
  eventEdits: (userId: string) => `user:${userId}:event_edits`,
  chatSessionsZset: (userId: string) => `user:${userId}:chat_sessions`,
  chatSessionMeta: (userId: string, sessionId: string) =>
    `user:${userId}:chat_session:${sessionId}`,
  chatSessionMessages: (userId: string, sessionId: string) =>
    `user:${userId}:chat_session:${sessionId}:messages`,
  profile: (userId: string) => `user:${userId}:profile`,
  /** Time-limited share token: share:{token} -> JSON { userId, expiresAt }, TTL set on write */
  shareToken: (token: string) => `share:${token}`,
  /** Set of pinned event IDs for the user */
  pinned: (userId: string) => `user:${userId}:pinned`,
} as const;
