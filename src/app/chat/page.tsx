"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      const text = data.text ?? (data.error ? `Error: ${data.error}` : "No response.");
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
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

  return (
    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-4rem)] animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">AI Chat</h1>
      <p className="text-[var(--text-muted)] mb-4">
        Ask questions about your health records. AI answers only from your data.
      </p>

      <div className="glass-panel glass-panel-glow rounded-xl flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              Ask a question about your health records. Example: &quot;What
              medications am I taking?&quot;
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-slide-up`}
            >
              <div
                data-testid={m.role === "assistant" ? "chat-assistant-message" : undefined}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-neon-cyan/30 border border-neon-cyan/50 text-neon-cyan"
                    : "bg-midnight-charcoal/80 text-[var(--text-primary)] border border-white/10"
                }`}
              >
                {m.content}
              </div>
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

        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-2">
          <input
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
  );
}
