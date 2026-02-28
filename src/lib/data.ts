/**
 * Data access layer - Redis operations per REDIS_SCHEMA.md
 * Single source of truth in Redis.
 */

import { redis } from "./redis";
import { keys } from "./schema";
import type { HealthEvent, Summary, MemoryStats } from "./types";

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
  return events;
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  await redis.sadd(keys.deleted(userId), eventId);
}

export async function getEventCount(userId: string): Promise<number> {
  const streamKey = keys.events(userId);
  return redis.xlen(streamKey);
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
