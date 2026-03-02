/**
 * Chat session persistence - conversation history in Redis.
 */

import { redis } from "./redis";
import { keys } from "./schema";
import type { ChatSessionMeta, StoredChatMessage } from "./types";

const CHAT_SESSION_TITLE_MAX = 50;
const CHAT_CONTEXT_MAX_MESSAGES = 50;

function generateSessionId(): string {
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function sessionTitleFromMessage(message: string): string {
  const t = message.trim().slice(0, CHAT_SESSION_TITLE_MAX);
  return t ? t + (message.length > CHAT_SESSION_TITLE_MAX ? "…" : "") : "New chat";
}

export async function createChatSession(
  userId: string,
  title: string
): Promise<ChatSessionMeta> {
  const id = generateSessionId();
  const now = new Date().toISOString();
  const meta: ChatSessionMeta = { id, title, createdAt: now, updatedAt: now };
  const metaKey = keys.chatSessionMeta(userId, id);
  const zkey = keys.chatSessionsZset(userId);
  await Promise.all([
    redis.hset(metaKey, {
      title: meta.title,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    }),
    redis.zadd(zkey, { score: Date.now(), member: id }),
  ]);
  return meta;
}

export async function listChatSessions(userId: string): Promise<ChatSessionMeta[]> {
  const zkey = keys.chatSessionsZset(userId);
  const sessionIds = await redis.zrange<string[]>(zkey, 0, -1, { rev: true });
  if (!sessionIds?.length) return [];
  const metas: ChatSessionMeta[] = [];
  for (const id of sessionIds) {
    const raw = await redis.hgetall<Record<string, string>>(keys.chatSessionMeta(userId, id));
    if (raw && raw.title != null)
      metas.push({
        id,
        title: String(raw.title),
        createdAt: String(raw.createdAt ?? ""),
        updatedAt: String(raw.updatedAt ?? ""),
      });
  }
  return metas;
}

export async function getChatSessionMeta(
  userId: string,
  sessionId: string
): Promise<ChatSessionMeta | null> {
  const raw = await redis.hgetall<Record<string, string>>(
    keys.chatSessionMeta(userId, sessionId)
  );
  if (!raw || raw.title == null) return null;
  return {
    id: sessionId,
    title: String(raw.title),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function getChatSessionMessages(
  userId: string,
  sessionId: string
): Promise<StoredChatMessage[]> {
  const listKey = keys.chatSessionMessages(userId, sessionId);
  const raw = await redis.lrange(listKey, 0, -1);
  if (!raw?.length) return [];
  return raw.map((s) => {
    if (typeof s === "object" && s !== null) return s as StoredChatMessage;
    return JSON.parse(typeof s === "string" ? s : String(s)) as StoredChatMessage;
  });
}

/** Build "AI Working Memory" string from session messages (last N) for context. */
export function buildSessionContext(messages: StoredChatMessage[]): string {
  const recent = messages.slice(-CHAT_CONTEXT_MAX_MESSAGES);
  return recent
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join("\n\n");
}

export async function appendChatMessages(
  userId: string,
  sessionId: string,
  messages: StoredChatMessage[],
  options: { title?: string; updateTimestamp?: boolean }
): Promise<void> {
  const listKey = keys.chatSessionMessages(userId, sessionId);
  const metaKey = keys.chatSessionMeta(userId, sessionId);
  const zkey = keys.chatSessionsZset(userId);
  const now = new Date().toISOString();
  const pipeline: Promise<unknown>[] = [];
  for (const msg of messages) {
    const stored: StoredChatMessage = { ...msg, createdAt: msg.createdAt || now };
    pipeline.push(redis.rpush(listKey, JSON.stringify(stored)));
  }
  if (options.title != null) {
    pipeline.push(redis.hset(metaKey, { title: options.title }));
  }
  if (options.updateTimestamp !== false) {
    pipeline.push(redis.hset(metaKey, { updatedAt: now }));
    pipeline.push(redis.zadd(zkey, { score: Date.now(), member: sessionId }));
  }
  await Promise.all(pipeline);
}

export async function deleteChatSession(userId: string, sessionId: string): Promise<void> {
  const metaKey = keys.chatSessionMeta(userId, sessionId);
  const listKey = keys.chatSessionMessages(userId, sessionId);
  const zkey = keys.chatSessionsZset(userId);
  await Promise.all([
    redis.del(metaKey),
    redis.del(listKey),
    redis.zrem(zkey, sessionId),
  ]);
}
