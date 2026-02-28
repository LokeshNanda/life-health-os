/**
 * OpenAI access control: only users in ALLOWED_OPENAI_USER_IDS may use
 * chat, summarize, and ingest voice/image. Env is server-only.
 */

export function isAllowedForOpenAI(userId: string): boolean {
  const raw = process.env.ALLOWED_OPENAI_USER_IDS ?? "";
  const allowed = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(userId);
}
