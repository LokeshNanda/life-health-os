"use client";

import { useState, useEffect, useCallback } from "react";
import { summarize, getMemoryStats, downloadSummary, getSummaryVersions, getSummaryByVersion, type SummaryVersionItem } from "@/lib/api";
import { SummarizeSkeleton } from "@/components/Skeleton";
import { Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";

const CATEGORIES = [
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SummarizePage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [result, setResult] = useState<{
    version: number;
    sizeBefore: number;
    sizeAfter: number;
    reduction: string;
    createdAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    size: number;
    entries: number;
    lastSummarized?: string | null;
    summaryVersion?: number | null;
  } | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "md" | null>(null);
  const [versionList, setVersionList] = useState<SummaryVersionItem[]>([]);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [summarizeCategory, setSummarizeCategory] = useState<string>("");

  const loadVersions = useCallback(async () => {
    try {
      const v = await getSummaryVersions();
      setVersionList(v);
    } catch {
      setVersionList([]);
    }
  }, []);

  async function loadStats() {
    try {
      const s = await getMemoryStats();
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    loadStats();
  }, []);

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await summarize(summarizeCategory || undefined);
      setResult(r);
      loadStats();
      loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summarization failed");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Summarize Memory
        </h1>
        <SummarizeSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Summarize Memory
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        Create a condensed summary of your health records. User-triggered only.
        Raw data is never deleted.
      </p>
      {(!stats || stats.entries === 0) && (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Run a summary after you have more entries.
        </p>
      )}

      <div className="glass-panel glass-panel-glow rounded-xl p-6 space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Summarization preserves medications, dates, and diagnoses while
          removing redundancy. Your original events remain intact.
        </p>

        {stats && stats.entries > 0 && (
          <div className="rounded-lg bg-midnight/50 border border-white/10 p-3 text-sm text-[var(--text-primary)]">
            <strong>Before:</strong> {formatBytes(stats.size)} ({stats.entries}{" "}
            entries)
          </div>
        )}

        <button
          onClick={handleSummarize}
          disabled={loading || (stats?.entries ?? 0) === 0}
          className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? "Summarizing..." : "Summarize Now"}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="summarize-category" className="text-xs text-[var(--text-muted)]">
            Scope to category (optional):
          </label>
          <select
            id="summarize-category"
            value={summarizeCategory}
            onChange={(e) => setSummarizeCategory(e.target.value)}
            className="rounded-lg border border-white/20 bg-midnight/50 px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          >
            <option value="">All events</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {stats?.lastSummarized && !result && (
          <div className="rounded-lg border border-white/20 bg-midnight/50 p-3 space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              You have an existing summary (v{stats.summaryVersion ?? "?"}).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  setDownloading("pdf");
                  try {
                    await downloadSummary("pdf");
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading === "pdf" ? "..." : "Download as PDF"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDownloading("md");
                  try {
                    await downloadSummary("md");
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading === "md" ? "..." : "Download as Markdown"}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 p-4 space-y-2 animate-fade-slide-up">
            <p className="font-medium text-neon-cyan">Summary created</p>
            <p className="text-sm text-[var(--text-primary)]">
              Size before: {formatBytes(result.sizeBefore)} → after:{" "}
              {formatBytes(result.sizeAfter)} ({result.reduction} reduction)
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Version {result.version} at{" "}
              {new Date(result.createdAt).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={async () => {
                  setDownloading("pdf");
                  try {
                    await downloadSummary("pdf");
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading === "pdf" ? "Downloading..." : "Download as PDF"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDownloading("md");
                  try {
                    await downloadSummary("md");
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading === "md" ? "Downloading..." : "Download as Markdown"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {versionList.length > 0 && (
        <div className="mt-8 glass-panel rounded-xl p-4 animate-fade-slide-up">
          <p className="text-sm font-medium text-[var(--text-muted)] mb-3">Previous summaries</p>
          <ul className="space-y-2">
            {versionList.map((v) => (
              <li
                key={v.version}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-midnight/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neon-cyan" />
                  <span className="font-medium text-[var(--text-primary)]">
                    Version {v.version}
                  </span>
                  {v.createdAt && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (viewingVersion === v.version) {
                        setViewingVersion(null);
                        setViewContent(null);
                        return;
                      }
                      setViewingVersion(v.version);
                      try {
                        const s = await getSummaryByVersion(v.version);
                        setViewContent(s.content);
                      } catch {
                        setViewContent("Failed to load.");
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  >
                    {viewingVersion === v.version ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    View
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDownloading("pdf");
                      try {
                        await downloadSummary("pdf", v.version);
                      } finally {
                        setDownloading(null);
                      }
                    }}
                    disabled={downloading !== null}
                    className="flex items-center gap-1 rounded-lg border border-neon-cyan/50 px-2 py-1.5 text-xs font-medium text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDownloading("md");
                      try {
                        await downloadSummary("md", v.version);
                      } finally {
                        setDownloading(null);
                      }
                    }}
                    disabled={downloading !== null}
                    className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-white/5 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    MD
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {viewingVersion != null && viewContent != null && (
            <div className="mt-4 rounded-lg border border-white/10 bg-midnight/80 p-4 max-h-80 overflow-y-auto">
              <p className="text-xs text-[var(--text-muted)] mb-2">Version {viewingVersion}</p>
              <MarkdownViewer content={viewContent} className="font-sans" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
