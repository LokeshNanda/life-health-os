"use client";

import { useState, useEffect } from "react";
import { summarize, getMemoryStats } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SummarizePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    version: number;
    sizeBefore: number;
    sizeAfter: number;
    reduction: string;
    createdAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ size: number; entries: number } | null>(null);

  async function loadStats() {
    try {
      const s = await getMemoryStats();
      setStats(s);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await summarize();
      setResult(r);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summarization failed");
    } finally {
      setLoading(false);
    }
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
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
