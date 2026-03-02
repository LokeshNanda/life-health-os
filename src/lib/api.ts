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

export async function ingestText(text: string, category?: string, timestamp?: string, tags?: string[]) {
  const res = await fetch("/api/ingest", fetchOptions({
    method: "POST",
    body: JSON.stringify({ text, category, ...(timestamp && { timestamp }), ...(tags?.length && { tags }) }),
  }));
  if (!res.ok) throw new Error((await res.json()).error ?? "Ingest failed");
  return res.json();
}

export async function ingestFile(file: File, category?: string, timestamp?: string, tags?: string[]) {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);
  if (timestamp) formData.append("timestamp", timestamp);
  if (tags?.length) formData.append("tags", tags.join(","));

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

export async function getEventsPage(opts?: { limit?: number; before?: string }) {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.before) params.set("before", opts.before);
  const q = params.toString();
  const res = await fetch(`/api/timeline${q ? `?${q}` : ""}`, fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json() as Promise<{ events: import("@/lib/types").HealthEvent[]; nextCursor: string | null }>;
}

export async function getTags(): Promise<string[]> {
  const res = await fetch("/api/tags", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch tags");
  const data = await res.json();
  return Array.isArray(data.tags) ? data.tags : [];
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

export type UpdateMemoryBody = {
  content?: string;
  category?: string;
  timestamp?: string;
  tags?: string[];
};

export async function updateMemory(
  eventId: string,
  body: UpdateMemoryBody
): Promise<{ eventId: string; editedAt: string; event?: import("@/lib/types").HealthEvent }> {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}`, fetchOptions({
    method: "PATCH",
    body: JSON.stringify(body),
  }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to update memory");
  }
  return res.json();
}

export async function revertMemoryEdit(eventId: string): Promise<{ eventId: string; reverted: boolean }> {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}/edit`, fetchOptions({
    method: "DELETE",
  }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to revert edit");
  }
  return res.json();
}

export async function getPinnedIds(): Promise<string[]> {
  const res = await fetch("/api/memory/pinned", fetchOptions());
  if (!res.ok) throw new Error("Failed to fetch pinned");
  const data = await res.json();
  return Array.isArray(data.pinned) ? data.pinned : [];
}

export async function pinMemory(eventId: string): Promise<{ pinned: boolean }> {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}/pin`, fetchOptions({ method: "POST" }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to pin");
  }
  return res.json();
}

export async function unpinMemory(eventId: string): Promise<{ pinned: boolean }> {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}/pin`, fetchOptions({ method: "DELETE" }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to unpin");
  }
  return res.json();
}

export async function getMemory(eventId: string): Promise<import("@/lib/types").HealthEvent> {
  const res = await fetch(`/api/memory/${encodeURIComponent(eventId)}`, fetchOptions());
  if (!res.ok) {
    if (res.status === 404) throw new Error("Event not found");
    const data = await res.json();
    throw new Error(data.error ?? "Failed to fetch memory");
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

export async function summarize(category?: string) {
  const res = await fetch("/api/summarize", fetchOptions({
    method: "POST",
    body: JSON.stringify(category ? { category } : {}),
  }));
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Summarize failed");
  }
  return res.json();
}

/** Download the latest summary as PDF or Markdown. Fetches blob and triggers download. */
export async function downloadSummary(format: "pdf" | "md", version?: number): Promise<void> {
  const url = new URL("/api/summary/download", typeof window !== "undefined" ? window.location.origin : "");
  url.searchParams.set("format", format);
  if (version != null) url.searchParams.set("version", String(version));
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {},
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("No summary found. Run summarization first.");
    throw new Error("Failed to download summary");
  }
  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="?([^";\n]+)"?/)?.[1] ||
    `health-memory-summary-${version != null ? `v${version}-` : ""}${new Date().toISOString().slice(0, 10)}.${format === "md" ? "md" : "pdf"}`;
  const urlObj = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlObj;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(urlObj);
}

export interface SummaryVersionItem {
  version: number;
  createdAt: string | null;
}

export async function getSummaryVersions(): Promise<SummaryVersionItem[]> {
  const res = await fetch("/api/summary/versions", {
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch summary versions");
  const data = await res.json();
  return Array.isArray(data.versions) ? data.versions : [];
}

export async function getSummaryByVersion(version: number): Promise<{
  version: number;
  content: string;
  createdAt: string;
  sizeBefore: number;
  sizeAfter: number;
}> {
  const res = await fetch(`/api/summary/${version}`, {
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {},
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Summary version not found");
    throw new Error("Failed to fetch summary");
  }
  return res.json();
}

export async function createShareLink(): Promise<{ url: string; expiresAt: string }> {
  const res = await fetch("/api/share", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create share link");
  }
  return res.json();
}

/** Download export PDF with provider-friendly filename (for sharing with doctor). */
export async function downloadProviderPdf(): Promise<void> {
  const res = await fetch("/api/export?format=pdf&for=provider", {
    credentials: "include",
    headers: process.env.NEXT_PUBLIC_DEV_USER_ID ? { "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID } : {},
  });
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="?([^";\n]+)"?/)?.[1] ||
    `health-memory-for-provider-${new Date().toISOString().slice(0, 10)}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

// --- Global search ---

export type SearchSource = "timeline" | "summaries" | "chat";

export interface GlobalSearchResult {
  timeline: { events: import("@/lib/types").HealthEvent[] };
  summaries: {
    summary: { version: number; content: string; createdAt: string; sizeBefore: number; sizeAfter: number };
    snippet: string;
  } | null;
  chat: {
    sessions: {
      id: string;
      title: string;
      createdAt: string;
      matches: { role: "user" | "assistant"; contentSnippet: string }[];
    }[];
  };
}

export async function searchGlobal(
  q: string,
  sources?: SearchSource[]
): Promise<GlobalSearchResult> {
  const params = new URLSearchParams();
  params.set("q", q);
  if (sources?.length) params.set("sources", sources.join(","));
  const res = await fetch(`/api/search?${params.toString()}`, fetchOptions());
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}
