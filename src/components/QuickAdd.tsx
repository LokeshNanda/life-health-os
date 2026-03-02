"use client";

import { useState, useCallback } from "react";
import { SignedIn } from "@clerk/nextjs";
import { ingestText } from "@/lib/api";
import { Plus } from "lucide-react";

const CATEGORIES = [
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
] as const;

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("note");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim() || status === "loading") return;
      setStatus("loading");
      setMessage("");
      try {
        const ts = `${entryDate}T12:00:00.000Z`;
        await ingestText(text.trim(), category, ts);
        setStatus("success");
        setMessage("Added.");
        setText("");
        setOpen(false);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to add");
      } finally {
        setStatus("idle");
      }
    },
    [text, category, entryDate, status]
  );

  return (
    <SignedIn>
      <div className="fixed bottom-6 right-6 z-40">
        {open && (
          <div
            className="absolute bottom-14 right-0 w-[min(90vw,320px)] rounded-xl border border-white/20 bg-midnight-charcoal shadow-xl glass-panel p-4 animate-fade-slide-up"
            role="dialog"
            aria-label="Quick add memory"
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Quick add
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as (typeof CATEGORIES)[number])
                }
                className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Note or paste text..."
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none"
                autoFocus
              />
              {message && (
                <p
                  className={`text-xs ${
                    status === "success" ? "text-neon-cyan" : "text-red-400"
                  }`}
                >
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "loading" || !text.trim()}
                className="w-full rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-3 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {status === "loading" ? "Adding..." : "Add memory"}
              </button>
            </form>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan shadow-lg hover:bg-neon-cyan/30 hover:shadow-glow transition-all"
          aria-label={open ? "Close quick add" : "Quick add memory"}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </SignedIn>
  );
}
