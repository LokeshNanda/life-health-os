/**
 * Client-side API helpers
 * Uses session cookie (credentials: include) for auth.
 * Falls back to x-user-id in dev when not signed in.
 */

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEV_USER_ID) {
    h["x-user-id"] = process.env.NEXT_PUBLIC_DEV_USER_ID;
  }
  return h;
}

function fetchOptions(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include" as RequestCredentials,
    headers: { ...headers(), ...init?.headers },
  };
}

export async function ingestText(text: string, category?: string) {
  const res = await fetch("/api/ingest", fetchOptions({
    method: "POST",
    body: JSON.stringify({ text, category }),
  }));
  if (!res.ok) throw new Error((await res.json()).error ?? "Ingest failed");
  return res.json();
}

export async function ingestFile(file: File, category?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);

  const res = await fetch("/api/ingest", {
    method: "POST",
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID
      ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID }
      : {},
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Ingest failed");
  }
  return res.json();
}

export async function getMemoryStats() {
  const res = await fetch("/api/memory/stats", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function getEvents() {
  const res = await fetch("/api/timeline", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function summarize() {
  const res = await fetch("/api/summarize", fetchOptions({
    method: "POST",
    body: JSON.stringify({}),
  }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Summarize failed");
  }
  return res.json();
}
