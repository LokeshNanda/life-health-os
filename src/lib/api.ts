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

export async function ingestText(text: string, category?: string, timestamp?: string) {
  const res = await fetch("/api/ingest", fetchOptions({
    method: "POST",
    body: JSON.stringify({ text, category, ...(timestamp && { timestamp }) }),
  }));
  if (!res.ok) throw new Error((await res.json()).error ?? "Ingest failed");
  return res.json();
}

export async function ingestFile(file: File, category?: string, timestamp?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);
  if (timestamp) formData.append("timestamp", timestamp);

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
  const res = await fetch("/api/timeline?limit=500", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.events ?? data;
}

export async function getEventsPage(opts?: { limit?: number; after?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.after) params.set("after", opts.after);
  const q = params.toString();
  const res = await fetch(`/api/timeline${q ? `?${q}` : ""}`, fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json() as Promise<{ events: import("@/lib/types").HealthEvent[]; nextCursor: string | null }>;
}

export async function deleteMemory(eventId: string) {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}`, fetchOptions({
    method: "DELETE",
  }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to delete memory");
  }
  return res.json();
}

export async function getExportData(): Promise<{
  exportedAt: string;
  events: unknown[];
  summary: { content: string; version: number; createdAt: string } | null;
}> {
  const res = await fetch("/api/export", fetchOptions());
  if (!res.ok) throw new Error("Failed to export");
  return res.json();
}

export type ExportFormat = "json" | "csv" | "pdf";

const EXPORT_FILENAME_PREFIX = "health-memory-export";

/** Download export as CSV or PDF (blob). For JSON use getExportData() and build blob client-side. */
export async function downloadExport(format: ExportFormat): Promise<void> {
  if (format === "json") {
    const data = await getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${EXPORT_FILENAME_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const res = await fetch(`/api/export?format=${format}`, {
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {},
  });
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="?([^";\n]+)"?/)?.[1] ||
    `${EXPORT_FILENAME_PREFIX}-${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "pdf"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

export async function clearChatContext() {
  const res = await fetch("/api/chat/context", fetchOptions({ method: "DELETE" }));
  if (!res.ok) throw new Error("Failed to clear context");
  return res.json();
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export async function getChatSessions(): Promise<{ sessions: ChatSessionMeta[] }> {
  const res = await fetch("/api/chat/sessions", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function getChatSession(sessionId: string): Promise<{
  session: ChatSessionMeta;
  messages: { role: "user" | "assistant"; content: string; followUps?: string[]; citations?: { id: string; category: string; date: string }[]; createdAt: string }[];
}> {
  const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, fetchOptions());
  if (!res.ok) {
    if (res.status === 404) throw new Error("Session not found");
    throw new Error("Failed to load session");
  }
  return res.json();
}

export async function deleteChatSession(sessionId: string): Promise<{ status: string; sessionId: string }> {
  const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, fetchOptions({
    method: "DELETE",
  }));
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}
