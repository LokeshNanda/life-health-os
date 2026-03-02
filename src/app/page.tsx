"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemoryStats, getEventsPage } from "@/lib/api";
import { Clock, FileText } from "lucide-react";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

type Profile = {
  displayName?: string;
  firstName?: string;
  preferredGreeting?: string;
} | null;

function greeting(profile: Profile): string {
  const name = profile?.displayName?.trim() || profile?.firstName?.trim();
  const pref = profile?.preferredGreeting?.trim();
  if (name && pref) return `${pref}, ${name}`;
  if (name) return `Hello, ${name}`;
  if (pref) return pref;
  return "Hello";
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(null);
  const [stats, setStats] = useState<{ entries: number; lastSummarized: string | null } | null>(null);
  const [recentEvents, setRecentEvents] = useState<{ id: string; content: string; timestamp: string; category: string }[]>([]);
  const [quickAsk, setQuickAsk] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") setProfile(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMemoryStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {});
    getEventsPage({ limit: 5 })
      .then((p) => { if (!cancelled) setRecentEvents(p.events.map((e) => ({ id: e.id, content: e.content.slice(0, 80), timestamp: e.timestamp, category: e.category }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function handleQuickAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = quickAsk.trim();
    if (!q) return;
    setQuickAsk("");
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        {greeting(profile)}
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        Your personal health knowledge base. Organize medical history, preserve
        context with AI summaries, and query your data in natural language.
      </p>
      <div className="glass-panel rounded-xl p-4 text-sm text-amber-200/90 border border-amber-500/30">
        <strong>Disclaimer:</strong> This app is for information organization
        only. It does NOT provide medical advice, diagnose conditions, or
        recommend treatments.
      </div>

      <OnboardingChecklist
        entriesCount={stats?.entries ?? 0}
        hasSummarized={!!stats?.lastSummarized}
      />

      <div className="mt-6 glass-panel rounded-xl p-4 animate-fade-slide-up">
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-2">Quick ask</h2>
        <form onSubmit={handleQuickAsk} className="flex gap-2">
          <input
            type="text"
            value={quickAsk}
            onChange={(e) => setQuickAsk(e.target.value)}
            placeholder="Ask a question about your health records..."
            className="flex-1 rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          />
          <button
            type="submit"
            disabled={!quickAsk.trim()}
            className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 shrink-0"
          >
            Ask
          </button>
        </form>
        {(stats?.entries ?? 0) === 0 && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Add memories first so the AI can answer from your data.{" "}
            <Link href="/upload" className="text-neon-cyan hover:underline">Add memory</Link>
          </p>
        )}
      </div>

      {(stats?.entries ?? 0) > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {recentEvents.length > 0 && (
            <div className="glass-panel rounded-xl p-4 animate-fade-slide-up">
              <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                <Clock className="h-4 w-4 text-neon-cyan" />
                Recent entries
              </h2>
              <ul className="space-y-1.5">
                {recentEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/timeline?highlight=${encodeURIComponent(e.id)}`}
                      className="block text-sm text-[var(--text-primary)] truncate hover:text-neon-cyan"
                    >
                      {e.content}{e.content.length >= 80 ? "…" : ""}
                    </Link>
                    <span className="text-xs text-[var(--text-muted)]">
                      {e.category.replace(/_/g, " ")} · {new Date(e.timestamp).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/timeline" className="mt-2 inline-block text-xs font-medium text-neon-cyan hover:underline">
                View timeline →
              </Link>
            </div>
          )}
          {stats?.lastSummarized && (
            <div className="glass-panel rounded-xl p-4 animate-fade-slide-up">
              <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                <FileText className="h-4 w-4 text-neon-cyan" />
                Last summary
              </h2>
              <p className="text-sm text-[var(--text-primary)]">
                {new Date(stats.lastSummarized).toLocaleString()}
              </p>
              <Link href="/summarize" className="mt-2 inline-block text-xs font-medium text-neon-cyan hover:underline">
                View or download →
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/upload"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.1s]"
        >
          <span className="font-medium text-neon-cyan">Add Memory</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Upload documents, add notes, or paste text
          </p>
        </Link>
        <Link
          href="/timeline"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.15s]"
        >
          <span className="font-medium text-neon-cyan">Health Timeline</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            View your health events chronologically
          </p>
        </Link>
        <Link
          href="/chat"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.2s]"
        >
          <span className="font-medium text-neon-cyan">AI Chat</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ask questions about your health records
          </p>
        </Link>
        <Link
          href="/summarize"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.25s]"
        >
          <span className="font-medium text-neon-cyan">Summarize</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create a condensed summary of your records
          </p>
        </Link>
      </div>
    </div>
  );
}
