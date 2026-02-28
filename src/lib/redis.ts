import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Add them to .env.local"
    );
  }
  if (!_redis) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/** Lazy Redis client – only connects when used (avoids build-time env requirement). */
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return getRedis()[prop as keyof Redis];
  },
});
