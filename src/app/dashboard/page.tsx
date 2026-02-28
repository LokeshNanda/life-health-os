"use client";

import { useEffect, useState } from "react";
import { getMemoryStats } from "@/lib/api";

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
        <p className="text-[var(--text-muted)]">Loading...</p>
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
    </div>
  );
}
