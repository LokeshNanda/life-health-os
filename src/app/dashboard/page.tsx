"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMemoryStats, getExportData } from "@/lib/api";
import { Download } from "lucide-react";
import { DashboardSkeleton } from "@/components/Skeleton";

interface Stats {
  size: number;
  entries: number;
  lastSummarized: string | null;
  summaryVersion: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    getMemoryStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Memory Size Dashboard
        </h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Memory Size Dashboard
        </h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Memory Size Dashboard
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        Overview of your health memory storage and summarization status.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-panel glass-panel-glow rounded-xl p-4 animate-kpi-up">
          <p className="text-sm font-medium text-[var(--text-muted)]">Total Size</p>
          <p className="mt-1 text-2xl font-semibold text-neon-cyan">
            {stats ? formatBytes(stats.size) : "—"}
          </p>
        </div>
        <div className="glass-panel glass-panel-glow rounded-xl p-4 animate-kpi-up [animation-delay:0.1s]">
          <p className="text-sm font-medium text-[var(--text-muted)]">Entries</p>
          <p className="mt-1 text-2xl font-semibold text-neon-cyan">
            {stats?.entries ?? "—"}
          </p>
        </div>
        <div className="glass-panel glass-panel-glow rounded-xl p-4 sm:col-span-2 animate-fade-slide-up [animation-delay:0.2s]">
          <p className="text-sm font-medium text-[var(--text-muted)]">Last Summarized</p>
          <p className="mt-1 text-[var(--text-primary)]">
            {stats?.lastSummarized
              ? new Date(stats.lastSummarized).toLocaleString()
              : "Never"}
          </p>
          {stats?.summaryVersion != null && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Summary version: {stats.summaryVersion}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || (stats?.entries ?? 0) === 0}
          className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export Data (JSON)"}
        </button>
        {(stats?.entries ?? 0) === 0 && (
          <Link
            href="/upload"
            className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all"
          >
            Add your first memory
          </Link>
        )}
      </div>
    </div>
  );
}
