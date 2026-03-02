"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getChatSessions, getChatSession, deleteChatSession, getTags, getMemoryStats, type ChatSessionMeta } from "@/lib/api";
import { MessageSquarePlus, Trash2, MessageCircle } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";

interface Citation {
  id: string;
  category: string;
  date: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  citations?: Citation[];
}

const SUGGESTED_PROMPTS = [
  "What medications am I taking?",
  "Summarize my recent lab results",
  "When was my last checkup?",
  "What diagnoses are in my records?",
  "List my medical events from the past year",
];

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");
  const qFromUrl = searchParams.get("q") ?? "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [scopeTags, setScopeTags] = useState<string[]>([]);
  const [entriesCount, setEntriesCount] = useState<number | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const [sessionsRes, tagsRes, statsRes] = await Promise.all([
        getChatSessions(),
        getTags().catch(() => []),
        getMemoryStats().catch(() => ({ entries: 0 })),
      ]);
      setSessions(sessionsRes.sessions);
      setAvailableTags(tagsRes);
      setEntriesCount(typeof statsRes?.entries === "number" ? statsRes.entries : 0);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const { messages: msgs } = await getChatSession(id);
      setMessages(msgs.map((m) => ({
        role: m.role,
        content: m.content,
        followUps: m.followUps,
        citations: m.citations,
      })));
      setSessionId(id);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (qFromUrl) setInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (sessionFromUrl && !sessionsLoading && sessions.length > 0 && sessionId !== sessionFromUrl) {
      const exists = sessions.some((s) => s.id === sessionFromUrl);
      if (exists) loadSession(sessionFromUrl);
    }
  }, [sessionFromUrl, sessionsLoading, sessions, sessionId, loadSession]);

  function handleNewChat() {
    setSessionId(null);
    setMessages([]);
    setInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_DEV_USER_ID && {
            "x-user-id": process.env.NEXT_PUBLIC_DEV_USER_ID,
          }),
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId ?? undefined,
          stream: true,
          ...(scopeTags.length > 0 && { tags: scopeTags }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedContent = "";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "" },
        ]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6);
                if (raw === "[DONE]") continue;
                try {
                  const data = JSON.parse(raw);
                  if (data.delta != null) {
                    streamedContent += data.delta;
                    setMessages((prev) => {
                      const next = [...prev];
                      const last = next[next.length - 1];
                      if (last?.role === "assistant") {
                        next[next.length - 1] = { ...last, content: streamedContent };
                      }
                      return next;
                    });
                  } else if (data.done === true) {
                    const followUps = Array.isArray(data.followUps) ? data.followUps : undefined;
                    const citations = Array.isArray(data.citations) ? data.citations : undefined;
                    setMessages((prev) => {
                      const next = [...prev];
                      const last = next[next.length - 1];
                      if (last?.role === "assistant") {
                        next[next.length - 1] = { ...last, followUps, citations };
                      }
                      return next;
                    });
                    if (data.sessionId) {
                      setSessionId(data.sessionId);
                      fetchSessions();
                    }
                  } else if (data.error) {
                    setMessages((prev) => {
                      const next = [...prev];
                      const last = next[next.length - 1];
                      if (last?.role === "assistant") {
                        next[next.length - 1] = { ...last, content: `Error: ${data.error}` };
                      } else {
                        next.push({ role: "assistant", content: `Error: ${data.error}` });
                      }
                      return next;
                    });
                  }
                } catch {
                  // skip invalid JSON
                }
              }
            }
          }
        }
      } else {
        const data = await res.json();
        const text = data.text ?? (data.error ? `Error: ${data.error}` : "No response.");
        const followUps = Array.isArray(data.followUps) ? data.followUps : undefined;
        const citations = Array.isArray(data.citations) ? data.citations : undefined;
        setMessages((prev) => [...prev, { role: "assistant", content: text, followUps, citations }]);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          fetchSessions();
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Request failed.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteChatSession(id);
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
      fetchSessions();
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-4xl flex flex-1 flex-col min-h-0 gap-4 animate-fade-slide-up">
      <div className="flex flex-1 gap-4 min-h-0">
      <aside className="w-52 shrink-0 flex flex-col border border-white/10 rounded-xl bg-midnight-charcoal/50 overflow-hidden min-h-0">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-neon-cyan border-b border-white/10 hover:bg-white/5 transition-colors"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
        <div className="flex-1 overflow-y-auto min-h-0">
          {sessionsLoading ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-muted)]">No conversations yet</p>
          ) : (
            <ul className="py-1">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-2 w-full border-l-2 transition-colors ${
                    sessionId === s.id
                      ? "border-neon-cyan bg-neon-cyan/10"
                      : "border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadSession(s.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 text-left text-sm min-w-0 text-[var(--text-primary)] hover:bg-white/5 transition-colors ${
                      sessionId !== s.id ? "text-[var(--text-muted)]" : ""
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.title || "Chat"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="shrink-0 p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2 shrink-0">AI Chat</h1>
      <p className="text-[var(--text-muted)] mb-4 shrink-0">
        Ask questions about your health records. AI answers only from your data.
      </p>
      {entriesCount === 0 && !sessionsLoading && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          <strong>No memories yet.</strong> Add memories first so the AI can answer from your data.{" "}
          <Link href="/upload" className="font-medium text-neon-cyan hover:underline">Add memory →</Link>
        </div>
      )}
      {availableTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-sm text-[var(--text-muted)]">Scope to tags:</span>
          <select
            value={scopeTags[0] ?? ""}
            onChange={(e) => setScopeTags(e.target.value ? [e.target.value] : [])}
            className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          >
            <option value="">All events</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {scopeTags.length > 0 && (
            <button
              type="button"
              onClick={() => setScopeTags([])}
              className="text-xs text-[var(--text-muted)] hover:text-neon-cyan"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="glass-panel glass-panel-glow rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="py-8 space-y-4">
              <p className="text-sm text-[var(--text-muted)] text-center">
                Ask something about your health records. Answers are based only on your data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] bg-white/5 border border-white/10 hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-fade-slide-up`}
            >
              <div
                data-testid={m.role === "assistant" ? "chat-assistant-message" : undefined}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-neon-cyan/30 border border-neon-cyan/50 text-neon-cyan"
                    : "bg-midnight-charcoal/80 text-[var(--text-primary)] border border-white/10"
                }`}
              >
                {m.role === "user" ? m.content : <MarkdownViewer content={m.content} />}
              </div>
              {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-primary)]">Sources:</span>
                  {m.citations.map((c) => (
                    <Link
                      key={c.id}
                      href={`/timeline?highlight=${encodeURIComponent(c.id)}`}
                      className="rounded bg-white/5 px-2 py-0.5 border border-white/10 hover:bg-neon-cyan/20 hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors"
                      title={`View event: ${c.category}, ${c.date}`}
                    >
                      {c.category.replace(/_/g, " ")}, {c.date}
                    </Link>
                  ))}
                </div>
              )}
              {m.role === "assistant" && m.followUps && m.followUps.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.followUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInput(q)}
                      className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] bg-white/5 border border-white/10 hover:bg-neon-cyan/10 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div data-testid="chat-assistant-message" className="rounded-lg bg-midnight-charcoal/80 px-3 py-2 text-sm text-[var(--text-muted)] border border-white/10 animate-pulse-subtle">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-2 shrink-0">
          <input
            ref={chatInputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-testid="chat-input"
            placeholder="Ask about your health records..."
            className="flex-1 rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            data-testid="chat-send-btn"
            className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all duration-200"
          >
            Send
          </button>
        </form>
      </div>
      </div>
      </div>
    </div>
  );
}
