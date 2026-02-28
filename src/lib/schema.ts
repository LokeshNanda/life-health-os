/**
 * Redis key schema per REDIS_SCHEMA.md
 * user:{userId}:events - Redis Stream
 * user:{userId}:ai_context - Redis String / JSON
 * user:{userId}:summary:{version} - Redis JSON
 * user:{userId}:meta - Redis Hash
 */

export const keys = {
  events: (userId: string) => `user:${userId}:events`,
  aiContext: (userId: string) => `user:${userId}:ai_context`,
  summary: (userId: string, version: number) => `user:${userId}:summary:${version}`,
  meta: (userId: string) => `user:${userId}:meta`,
  summaryVersions: (userId: string) => `user:${userId}:summary_versions`,
  deleted: (userId: string) => `user:${userId}:deleted`,
} as const;
