/**
 * Data access layer - Redis operations per REDIS_SCHEMA.md
 * Single source of truth in Redis.
 */

import { redis } from "./redis";
import { keys } from "./schema";
import {
  listChatSessions,
  getChatSessionMessages,
} from "./chat-sessions";
import type {
  HealthEvent,
  Summary,
  MemoryStats,
  DataCategory,
  ChatSessionMeta,
  StoredChatMessage,
  EventEdit,
} from "./types";

const AI_CONTEXT_MAX_SIZE = 16 * 1024; // 16KB bounded context

export async function addEvent(userId: string, event: HealthEvent): Promise<string> {
  const streamKey = keys.events(userId);
  const id = await redis.xadd(streamKey, "*", {
    data: JSON.stringify(event),
  });
  return id ?? "";
}

export async function getEvents(userId: string, count = 100): Promise<HealthEvent[]> {
  const streamKey = keys.events(userId);
  const deletedKey = keys.deleted(userId);
  const [results, deletedIds] = await Promise.all([
    redis.xrange<{ data: string | HealthEvent }>(streamKey, "-", "+", count),
    redis.smembers(deletedKey),
  ]);
  const deletedSet = new Set(deletedIds ?? []);
  const events = Object.values(results)
    .map((fields) => {
      const data = fields.data;
      if (typeof data === "object" && data !== null) return data as HealthEvent;
      return JSON.parse(data as string) as HealthEvent;
    })
    .filter((e) => !deletedSet.has(e.id));
  const editsMap = await getEditsMap(userId, events.map((e) => e.id));
  return applyEdits(events, editsMap);
}

function applyEdits(
  events: HealthEvent[],
  editsMap: Map<string, EventEdit>
): HealthEvent[] {
  return events.map((e) => {
    const edit = editsMap.get(e.id);
    if (!edit) return e;
    const merged: HealthEvent = {
      ...e,
      ...(edit.content !== undefined && { content: edit.content }),
      ...(edit.category !== undefined && { category: edit.category }),
      ...(edit.timestamp !== undefined && { timestamp: edit.timestamp }),
      ...(edit.tags !== undefined && { tags: edit.tags }),
      metadata: { ...e.metadata, editedAt: edit.editedAt },
    };
    return merged;
  });
}

async function getEditsMap(
  userId: string,
  eventIds: string[]
): Promise<Map<string, EventEdit>> {
  if (eventIds.length === 0) return new Map();
  const key = keys.eventEdits(userId);
  const values = await Promise.all(
    eventIds.map((id) => redis.hget<string>(key, id))
  );
  const map = new Map<string, EventEdit>();
  eventIds.forEach((id, i) => {
    const raw = values[i];
    if (raw != null) {
      try {
        const edit = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (edit && typeof edit.editedAt === "string") map.set(id, edit as EventEdit);
      } catch {
        /* ignore malformed */
      }
    }
  });
  return map;
}

export async function getEventEdit(
  userId: string,
  eventId: string
): Promise<EventEdit | null> {
  const raw = await redis.hget<string>(keys.eventEdits(userId), eventId);
  if (raw == null) return null;
  try {
    const edit = typeof raw === "string" ? JSON.parse(raw) : raw;
    return edit && typeof edit.editedAt === "string" ? (edit as EventEdit) : null;
  } catch {
    return null;
  }
}

export async function setEventEdit(
  userId: string,
  eventId: string,
  overrides: { content?: string; category?: DataCategory; timestamp?: string; tags?: string[] }
): Promise<EventEdit> {
  const existing = await getEventEdit(userId, eventId);
  const editedAt = new Date().toISOString();
  const merged: EventEdit = {
    ...(existing && {
      content: existing.content,
      category: existing.category,
      timestamp: existing.timestamp,
      tags: existing.tags,
    }),
    ...(overrides.content !== undefined && { content: overrides.content }),
    ...(overrides.category !== undefined && { category: overrides.category }),
    ...(overrides.timestamp !== undefined && { timestamp: overrides.timestamp }),
    ...(overrides.tags !== undefined && { tags: overrides.tags }),
    editedAt,
  };
  await redis.hset(keys.eventEdits(userId), { [eventId]: JSON.stringify(merged) });
  return merged;
}

export async function deleteEventEdit(userId: string, eventId: string): Promise<void> {
  await redis.hdel(keys.eventEdits(userId), eventId);
}

/** Returns event by id (from first 2000 events). Null if deleted or not found. */
export async function getEventById(
  userId: string,
  eventId: string
): Promise<HealthEvent | null> {
  const events = await getEvents(userId, 2000);
  return events.find((e) => e.id === eventId) ?? null;
}

const TIMELINE_PAGE_SIZE = 30;
/** Max events to fetch and sort by date (for timeline "by event date" ordering). */
const TIMELINE_FETCH_CAP = 1000;

export type EventsPage = { events: HealthEvent[]; nextCursor: string | null };

/** Compare event timestamps (ISO); for sort descending (latest first). */
function byTimestampDesc(a: HealthEvent, b: HealthEvent): number {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export async function getEventsPage(
  userId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<EventsPage> {
  const limit = opts.limit ?? TIMELINE_PAGE_SIZE;
  const beforeTimestamp = opts.before ?? undefined;
  // Fetch a bounded set, then sort by event occurrence date (timestamp) latest first.
  const events = await getEvents(userId, TIMELINE_FETCH_CAP);
  const sorted = [...events].sort(byTimestampDesc);
  const filtered = beforeTimestamp
    ? sorted.filter((e) => e.timestamp < beforeTimestamp)
    : sorted;
  const page = filtered.slice(0, limit);
  const nextCursor =
    filtered.length > limit ? page[page.length - 1].timestamp : null;
  return { events: page, nextCursor };
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  await redis.sadd(keys.deleted(userId), eventId);
}

export async function getEventCount(userId: string): Promise<number> {
  const streamKey = keys.events(userId);
  return redis.xlen(streamKey);
}

/** Returns sorted unique tags across all events (from first 500 events). */
export async function getUniqueTags(userId: string): Promise<string[]> {
  const events = await getEvents(userId, 500);
  const set = new Set<string>();
  events.forEach((e) => e.tags?.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export async function getAiContext(userId: string): Promise<string | null> {
  const ctx = await redis.get<string>(keys.aiContext(userId));
  return ctx;
}

export async function setAiContext(userId: string, content: string): Promise<void> {
  const truncated = content.slice(0, AI_CONTEXT_MAX_SIZE);
  await redis.set(keys.aiContext(userId), truncated);
}

export async function getLatestSummary(userId: string): Promise<Summary | null> {
  const version = await redis.get<number>(keys.summaryVersions(userId));
  if (version == null) return null;
  const summary = await redis.get<Summary>(keys.summary(userId, version));
  return summary;
}

export async function saveSummary(userId: string, summary: Summary): Promise<void> {
  await redis.set(keys.summary(userId, summary.version), summary);
  await redis.set(keys.summaryVersions(userId), summary.version);
}

export async function getMemoryStats(userId: string): Promise<MemoryStats> {
  const [events, lastSummary] = await Promise.all([
    getEvents(userId),
    getLatestSummary(userId),
  ]);

  return {
    size: JSON.stringify(events).length,
    entries: events.length,
    lastSummarized: lastSummary?.createdAt ?? null,
    summaryVersion: lastSummary?.version ?? null,
  };
}

export interface MemoryStatsWithBreakdown extends MemoryStats {
  byCategory: { category: DataCategory; count: number; size: number }[];
}

export async function getMemoryStatsWithBreakdown(
  userId: string
): Promise<MemoryStatsWithBreakdown> {
  const [events, lastSummary] = await Promise.all([
    getEvents(userId),
    getLatestSummary(userId),
  ]);
  const size = JSON.stringify(events).length;
  const byCategory = new Map<DataCategory, { count: number; size: number }>();
  for (const e of events) {
    const cat = e.category;
    const existing = byCategory.get(cat) ?? { count: 0, size: 0 };
    existing.count += 1;
    existing.size += JSON.stringify(e).length;
    byCategory.set(cat, existing);
  }
  const byCategoryList = Array.from(byCategory.entries()).map(([category, { count, size: s }]) => ({
    category,
    count,
    size: s,
  }));

  return {
    size,
    entries: events.length,
    lastSummarized: lastSummary?.createdAt ?? null,
    summaryVersion: lastSummary?.version ?? null,
    byCategory: byCategoryList,
  };
}

// --- Global search ---

const SEARCH_EVENTS_LIMIT = 500;
const SEARCH_RESULTS_MAX = 25;
const SEARCH_CHAT_SESSIONS_MAX = 15;
const SEARCH_SNIPPET_LEN = 100;

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function snippetAround(text: string, q: string, maxLen = SEARCH_SNIPPET_LEN): string {
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return text.slice(0, maxLen) + (text.length > maxLen ? "…" : "");
  const start = Math.max(0, idx - Math.floor(maxLen / 2));
  const end = Math.min(text.length, start + maxLen);
  const s = text.slice(start, end);
  return (start > 0 ? "…" : "") + s + (end < text.length ? "…" : "");
}

export interface SearchEventsResult {
  events: HealthEvent[];
}

export async function searchEvents(
  userId: string,
  q: string,
  limit = SEARCH_RESULTS_MAX
): Promise<SearchEventsResult> {
  if (!q || q.trim().length < 2) return { events: [] };
  const events = await getEvents(userId, SEARCH_EVENTS_LIMIT);
  const qTrim = q.trim().toLowerCase();
  const filtered = events.filter(
    (e) =>
      e.content.toLowerCase().includes(qTrim) ||
      e.category.toLowerCase().includes(qTrim) ||
      (e.tags?.some((t) => t.toLowerCase().includes(qTrim)) ?? false)
  );
  return { events: filtered.slice(0, limit) };
}

export interface SearchSummaryResult {
  summary: Summary;
  snippet: string;
}

export async function searchSummary(
  userId: string,
  q: string
): Promise<SearchSummaryResult | null> {
  if (!q || q.trim().length < 2) return null;
  const summary = await getLatestSummary(userId);
  if (!summary || !matchesQuery(summary.content, q)) return null;
  return {
    summary,
    snippet: snippetAround(summary.content, q.trim(), 180),
  };
}

export interface ChatSearchMatch {
  role: "user" | "assistant";
  contentSnippet: string;
}

export interface SearchChatResultItem {
  id: string;
  title: string;
  createdAt: string;
  matches: ChatSearchMatch[];
}

export interface SearchChatResult {
  sessions: SearchChatResultItem[];
}

export async function searchChat(
  userId: string,
  q: string,
  sessionLimit = SEARCH_CHAT_SESSIONS_MAX
): Promise<SearchChatResult> {
  if (!q || q.trim().length < 2) return { sessions: [] };
  const qTrim = q.trim().toLowerCase();
  const sessions = await listChatSessions(userId);
  const byTitle = sessions.filter((s) =>
    s.title.toLowerCase().includes(qTrim)
  );
  const rest = sessions.filter(
    (s) => !s.title.toLowerCase().includes(qTrim)
  ).slice(0, sessionLimit);
  const out: SearchChatResultItem[] = [];

  for (const s of byTitle) {
    out.push({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      matches: [{ role: "user", contentSnippet: s.title }],
    });
  }

  for (const s of rest) {
    const messages = await getChatSessionMessages(userId, s.id);
    const messageMatches: ChatSearchMatch[] = [];
    for (const m of messages) {
      if (matchesQuery(m.content, qTrim)) {
        messageMatches.push({
          role: m.role,
          contentSnippet: snippetAround(m.content, qTrim),
        });
      }
    }
    if (messageMatches.length > 0) {
      out.push({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        matches: messageMatches.slice(0, 5),
      });
    }
  }

  return { sessions: out.slice(0, SEARCH_RESULTS_MAX) };
}
