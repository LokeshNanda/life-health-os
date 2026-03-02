"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getEventsPage, deleteMemory, getExportData } from "@/lib/api";
import type { HealthEvent, DataCategory } from "@/lib/types";
import { Trash2, Search, Download } from "lucide-react";
import { TimelineSkeleton } from "@/components/Skeleton";

const CATEGORIES: (DataCategory | "all")[] = [
  "all",
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
];

const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
] as const;

function filterEvents(
  events: HealthEvent[],
  category: DataCategory | "all",
  search: string,
  dateRange: string
): HealthEvent[] {
  let result = events;

  if (category !== "all") {
    result = result.filter((e) => e.category === category);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.content.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }

  if (dateRange !== "all") {
    const days = parseInt(dateRange, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter((e) => new Date(e.timestamp) >= cutoff);
  }

  return result;
}

export default function TimelinePage() {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<DataCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const filteredEvents = useMemo(
    () => filterEvents(events, categoryFilter, searchQuery, dateRange),
    [events, categoryFilter, searchQuery, dateRange]
  );

  const loadEvents = useCallback((after?: string) => {
    if (after) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    getEventsPage({ after })
      .then((page) => {
        if (after) {
          setEvents((prev) => [...prev, ...page.events]);
        } else {
          setEvents(page.events);
        }
        setNextCursor(page.nextCursor);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleDelete(event: HealthEvent) {
    if (!confirm(`Delete this memory? "${event.content.slice(0, 50)}${event.content.length > 50 ? "..." : ""}"`)) {
      return;
    }
    setDeletingId(event.id);
    try {
      await deleteMemory(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await getExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Health Timeline
        </h1>
        <TimelineSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Health Timeline
        </h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Health Timeline
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-[var(--text-muted)]">
          Your health events in chronological order. Timeline-first navigation.
        </p>
        {events.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 transition-all"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export"}
          </button>
        )}
      </div>

      {events.length > 0 && (
        <div className="glass-panel glass-panel-glow rounded-xl p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/20 bg-midnight/50 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as DataCategory | "all")}
              className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || categoryFilter !== "all" || dateRange !== "all") && (
            <p className="text-xs text-[var(--text-muted)]">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="glass-panel rounded-xl border-dashed border-white/20 p-8 text-center">
          <p className="text-[var(--text-muted)] mb-4">
            No memories yet. Your health timeline will show events chronologically as you add them.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 transition-all"
          >
            Add your first memory
          </Link>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-panel rounded-xl border-dashed border-white/20 p-8 text-center text-[var(--text-muted)]">
          No events match your filters. Try adjusting the search, category, or date range.
        </div>
      ) : (
        <div className="space-y-0">
          {filteredEvents.map((event, i) => (
            <div
              key={event.id}
              className="flex gap-4 border-b border-white/10 py-4 last:border-0 animate-fade-slide-up group"
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              <div className="shrink-0 w-32 text-sm text-[var(--text-muted)]">
                {new Date(event.timestamp).toLocaleDateString()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block rounded bg-neon-cyan/20 px-2 py-0.5 text-xs font-medium text-neon-cyan">
                  {event.category.replace(/_/g, " ")}
                </span>
                <p className="mt-1 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {event.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(event)}
                disabled={deletingId === event.id}
                className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                title="Delete memory"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {nextCursor && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                type="button"
                onClick={() => loadEvents(nextCursor)}
                disabled={loadingMore}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
