"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getEventsPage, deleteMemory, updateMemory, revertMemoryEdit, getMemory, getExportData, downloadExport, getPinnedIds, pinMemory, unpinMemory } from "@/lib/api";
import type { ExportFormat } from "@/lib/api";
import type { HealthEvent, DataCategory } from "@/lib/types";
import { Trash2, Search, Download, Pencil, Undo2, Star } from "lucide-react";
import { TimelineSkeleton } from "@/components/Skeleton";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { TagInput } from "@/components/TagInput";

const CATEGORIES: (DataCategory | "all")[] = [
  "all",
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
];

const EDIT_CATEGORIES: DataCategory[] = [
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
  { value: "custom", label: "Custom range" },
] as const;

type SortOrder = "newest" | "oldest";

function filterEvents(
  events: HealthEvent[],
  category: DataCategory | "all",
  search: string,
  dateRange: string,
  tagFilter: string | null,
  dateFrom: string,
  dateTo: string
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
        e.category.toLowerCase().includes(q) ||
        (e.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
    );
  }

  if (dateRange === "custom" && (dateFrom || dateTo)) {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.timestamp) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.timestamp) <= to);
    }
  } else if (dateRange !== "all" && dateRange !== "custom") {
    const days = parseInt(dateRange, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter((e) => new Date(e.timestamp) >= cutoff);
  }

  if (tagFilter) {
    result = result.filter(
      (e) => Array.isArray(e.tags) && e.tags.includes(tagFilter)
    );
  }

  return result;
}

/** Heuristic: content is long if it has more than 3 lines or is over ~180 chars (≈3 lines). */
function isContentLong(content: string): boolean {
  const lines = content.split("\n").length;
  return lines > 3 || content.length > 180;
}

export default function TimelinePage() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<DataCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const [dateRange, setDateRange] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null);
  const [modalTop, setModalTop] = useState<number>(24);
  const [editForm, setEditForm] = useState({ content: "", category: "note" as DataCategory, date: "", tags: [] as string[] });
  const [savingEdit, setSavingEdit] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [expandedContentIds, setExpandedContentIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const loadPinned = useCallback(async () => {
    try {
      const ids = await getPinnedIds();
      setPinnedIds(new Set(ids));
    } catch {
      setPinnedIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadPinned();
  }, [loadPinned]);

  const toggleContentExpanded = useCallback((eventId: string) => {
    setExpandedContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    const filtered = filterEvents(
      events,
      categoryFilter,
      searchQuery,
      dateRange,
      tagFilter,
      dateFrom,
      dateTo
    );
    if (sortOrder === "oldest") {
      return [...filtered].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }
    return filtered;
  }, [
    events,
    categoryFilter,
    searchQuery,
    dateRange,
    tagFilter,
    dateFrom,
    dateTo,
    sortOrder,
  ]);

  const loadEvents = useCallback((before?: string) => {
    if (before) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    getEventsPage({ before })
      .then((page) => {
        if (before) {
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

  useEffect(() => {
    if (qFromUrl) setSearchQuery(qFromUrl);
  }, [qFromUrl]);

  const highlightId = searchParams.get("highlight");
  useEffect(() => {
    if (!highlightId || filteredEvents.length === 0) return;
    const el = document.getElementById(`event-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, filteredEvents.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingEvent) closeEditModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingEvent]);

  async function handleDelete(event: HealthEvent) {
    if (!confirm(`Delete this memory? "${event.content.slice(0, 50)}${event.content.length > 50 ? "..." : ""}"`)) {
      return;
    }
    setDeletingId(event.id);
    try {
      await deleteMemory(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      if (editingEvent?.id === event.id) setEditingEvent(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function openEditModal(event: HealthEvent, e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const vh = typeof window !== "undefined" ? window.innerHeight : 600;
    const modalMaxH = Math.min(520, vh - 48);
    // Position modal near the clicked row but keep it in viewport
    const top = Math.max(16, Math.min(rect.top - 16, vh - modalMaxH - 24));
    setModalTop(top);
    setEditingEvent(event);
    setEditForm({
      content: event.content,
      category: event.category,
      date: event.timestamp.slice(0, 10),
      tags: event.tags ?? [],
    });
  }

  function closeEditModal() {
    setEditingEvent(null);
    setSavingEdit(false);
  }

  async function handleSaveEdit() {
    if (!editingEvent || savingEdit) return;
    setSavingEdit(true);
    try {
      const timestamp = editForm.date ? `${editForm.date}T12:00:00.000Z` : editingEvent.timestamp;
      const res = await updateMemory(editingEvent.id, {
        content: editForm.content.trim(),
        category: editForm.category,
        timestamp,
        tags: editForm.tags,
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id && res.event ? res.event : e))
      );
      closeEditModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update memory");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRevertEdit(event: HealthEvent) {
    if (!confirm("Revert this memory to its original content? This cannot be undone.")) return;
    setRevertingId(event.id);
    try {
      await revertMemoryEdit(event.id);
      const original = await getMemory(event.id);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? original : e)));
      if (editingEvent?.id === event.id) closeEditModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revert");
    } finally {
      setRevertingId(null);
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

  async function handleExportFormat(format: ExportFormat) {
    setExporting(true);
    try {
      await downloadExport(format);
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 transition-all"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "JSON"}
            </button>
            <button
              type="button"
              onClick={() => handleExportFormat("csv")}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportFormat("pdf")}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
            >
              PDF
            </button>
          </div>
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
            {dateRange === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                  aria-label="From date"
                />
                <span className="text-[var(--text-muted)] text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                  aria-label="To date"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                aria-label="Sort order"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            {allTags.length > 0 && (
              <select
                value={tagFilter ?? ""}
                onChange={(e) => setTagFilter(e.target.value || null)}
                className="rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
          {(searchQuery || categoryFilter !== "all" || dateRange !== "all" || tagFilter || sortOrder !== "newest") && (
            <p className="text-xs text-[var(--text-muted)]">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="glass-panel rounded-xl border-dashed border-white/20 p-8 text-center">
          <p className="text-[var(--text-muted)] mb-4">
            No memories yet. Add your first memory to build your health timeline.
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
              id={`event-${event.id}`}
              key={event.id}
              className={`flex gap-4 border-b border-white/10 py-4 last:border-0 animate-fade-slide-up group ${highlightId === event.id ? "ring-2 ring-neon-cyan/50 rounded-lg" : ""}`}
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              <div className="shrink-0 w-32 text-sm text-[var(--text-muted)]">
                {new Date(event.timestamp).toLocaleDateString()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block rounded bg-neon-cyan/20 px-2 py-0.5 text-xs font-medium text-neon-cyan">
                  {event.category.replace(/_/g, " ")}
                </span>
                {event.tags && event.tags.length > 0 && (
                  <span className="ml-2 inline-flex flex-wrap gap-1">
                    {event.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--text-muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                )}
                {(event.metadata as { editedAt?: string } | undefined)?.editedAt && (
                  <span className="ml-2 text-xs text-[var(--text-muted)]" title={`Edited on ${new Date((event.metadata as { editedAt: string }).editedAt).toLocaleString()}`}>
                    Edited
                  </span>
                )}
                {pinnedIds.has(event.id) && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                    <Star className="h-3 w-3 fill-current" />
                    Pinned
                  </span>
                )}
                <div className="mt-1">
                  <div
                    className={`text-sm text-[var(--text-primary)] ${!expandedContentIds.has(event.id) && isContentLong(event.content) ? "line-clamp-3" : ""}`}
                  >
                    <MarkdownViewer content={event.content} />
                  </div>
                  {isContentLong(event.content) && (
                    <button
                      type="button"
                      onClick={() => toggleContentExpanded(event.id)}
                      className="mt-1 text-xs font-medium text-neon-cyan hover:underline focus:outline-none focus:underline"
                    >
                      {expandedContentIds.has(event.id) ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    const isPinned = pinnedIds.has(event.id);
                    try {
                      if (isPinned) await unpinMemory(event.id);
                      else await pinMemory(event.id);
                      setPinnedIds((prev) => {
                        const next = new Set(prev);
                        if (isPinned) next.delete(event.id);
                        else next.add(event.id);
                        return next;
                      });
                    } catch {
                      // ignore
                    }
                  }}
                  className={`p-2 rounded-lg ${pinnedIds.has(event.id) ? "text-amber-400" : "text-[var(--text-muted)] hover:bg-amber-500/20 hover:text-amber-400"}`}
                  title={pinnedIds.has(event.id) ? "Unpin" : "Pin"}
                >
                  <Star className={`h-4 w-4 ${pinnedIds.has(event.id) ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => openEditModal(event, e)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-neon-cyan/20 hover:text-neon-cyan"
                  title="Edit memory"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {(event.metadata as { editedAt?: string } | undefined)?.editedAt && (
                  <button
                    type="button"
                    onClick={() => handleRevertEdit(event)}
                    disabled={revertingId === event.id}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] disabled:opacity-50"
                    title="Revert to original"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(event)}
                  disabled={deletingId === event.id}
                  className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                  title="Delete memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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

      {editingEvent && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 bg-black/60"
          style={{ paddingTop: modalTop }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-memory-title"
        >
          <div className="glass-panel glass-panel-glow rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 shadow-xl">
            <h2 id="edit-memory-title" className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Edit memory
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-content" className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Content
                </label>
                <textarea
                  id="edit-content"
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                  rows={5}
                  className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                />
              </div>
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Category
                </label>
                <select
                  id="edit-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as DataCategory }))}
                  className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                >
                  {EDIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-date" className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Date
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                />
              </div>
              <div>
                <label htmlFor="edit-tags" className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Tags (comma-separated or type and press Enter)
                </label>
                <TagInput
                  id="edit-tags"
                  value={editForm.tags}
                  onChange={(tags) => setEditForm((f) => ({ ...f, tags }))}
                  placeholder="e.g. cardiologist, 2024 physical"
                  disabled={savingEdit}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editForm.content.trim()}
                className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
