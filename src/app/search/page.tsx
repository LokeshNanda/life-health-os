"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { searchGlobal, type SearchSource, type GlobalSearchResult } from "@/lib/api";
import type { HealthEvent } from "@/lib/types";
import { Clock, FileText, MessageSquare, Search as SearchIcon } from "lucide-react";

const SOURCE_OPTIONS: { id: SearchSource; label: string; icon: typeof Clock }[] = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "summaries", label: "Summaries", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 250;

export default function SearchPage() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qFromUrl);
  const [sources, setSources] = useState<Set<SearchSource>>(new Set(["timeline", "summaries", "chat"]));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = useCallback((source: SearchSource) => {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sourcesList = Array.from(sources);
      const res = await searchGlobal(q, sourcesList.length ? sourcesList : undefined);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query.trim(), sources]);

  useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResult(null);
      return;
    }
    const t = setTimeout(runSearch, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, sources, runSearch]);

  const hasResults = useMemo(() => {
    if (!result) return false;
    const hasTimeline = result.timeline.events.length > 0;
    const hasSummaries = result.summaries != null;
    const hasChat = result.chat.sessions.length > 0;
    return hasTimeline || hasSummaries || hasChat;
  }, [result]);

  return (
    <div className="mx-auto max-w-3xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Search
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        Search across your timeline, summaries, and chat.
      </p>

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30"
            autoFocus
            aria-label="Search query"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleSource(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                sources.has(id)
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                  : "bg-white/5 text-[var(--text-muted)] border border-white/10 hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 text-[var(--text-muted)] text-sm">Searching…</p>
      )}

      {!loading && query.trim().length >= MIN_QUERY_LEN && result && !hasResults && (
        <p className="mt-6 text-[var(--text-muted)]">No results for &quot;{query.trim()}&quot;.</p>
      )}

      {!loading && result && hasResults && (
        <div className="mt-8 space-y-8">
          {result.timeline.events.length > 0 && (
            <section aria-label="Timeline results">
              <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)] mb-4">
                <Clock className="h-5 w-5 text-neon-cyan" />
                Timeline
              </h2>
              <ul className="space-y-3">
                {result.timeline.events.map((event) => (
                  <TimelineEventCard key={event.id} event={event} query={query.trim()} />
                ))}
              </ul>
            </section>
          )}

          {result.summaries != null && (
            <section aria-label="Summary results">
              <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)] mb-4">
                <FileText className="h-5 w-5 text-neon-cyan" />
                Summary
              </h2>
              <Link
                href="/summarize"
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-neon-cyan/30 hover:bg-white/[0.07] transition-all"
              >
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  Version {result.summaries.summary.version} ·{" "}
                  {new Date(result.summaries.summary.createdAt).toLocaleDateString()}
                </p>
                <p className="text-[var(--text-primary)] line-clamp-2">
                  {result.summaries.snippet}
                </p>
              </Link>
            </section>
          )}

          {result.chat.sessions.length > 0 && (
            <section aria-label="Chat results">
              <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)] mb-4">
                <MessageSquare className="h-5 w-5 text-neon-cyan" />
                Chat
              </h2>
              <ul className="space-y-3">
                {result.chat.sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/chat?session=${encodeURIComponent(session.id)}`}
                      className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-neon-cyan/30 hover:bg-white/[0.07] transition-all"
                    >
                      <p className="font-medium text-[var(--text-primary)] truncate mb-1">
                        {session.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mb-2">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                      <ul className="space-y-1">
                        {session.matches.slice(0, 3).map((m, i) => (
                          <li
                            key={i}
                            className="text-sm text-[var(--text-muted)] line-clamp-1 pl-2 border-l-2 border-white/10"
                          >
                            <span className="text-[var(--text-primary)]/80">
                              {m.role === "user" ? "You: " : "AI: "}
                            </span>
                            {m.contentSnippet}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ event, query }: { event: HealthEvent; query: string }) {
  const snippet =
    event.content.length <= 120
      ? event.content
      : event.content.slice(0, 120) + "…";
  return (
    <li>
      <Link
        href={`/timeline?q=${encodeURIComponent(query)}`}
        className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-neon-cyan/30 hover:bg-white/[0.07] transition-all"
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="inline-block rounded bg-neon-cyan/20 px-2 py-0.5 text-xs font-medium text-neon-cyan">
            {event.category.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(event.timestamp).toLocaleDateString()}
          </span>
        </div>
        <p className="text-[var(--text-primary)] text-sm line-clamp-2">{snippet}</p>
      </Link>
    </li>
  );
}
