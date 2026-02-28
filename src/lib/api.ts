/**
 * Client-side API helpers with auth header placeholder
 * In production, replace with real auth (session/JWT)
 */

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    h["x-user-id"] =
      process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user";
  }
  return h;
}

export async function ingestText(text: string, category?: string) {
  const res = await fetch("/api/ingest", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text, category }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Ingest failed");
  return res.json();
}

export async function getMemoryStats() {
  const res = await fetch("/api/memory/stats", { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function getEvents() {
  const res = await fetch("/api/timeline", { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function summarize() {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Summarize failed");
  }
  return res.json();
}
