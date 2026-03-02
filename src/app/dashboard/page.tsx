"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMemoryStats, getExportData, downloadExport, downloadSummary, createShareLink, downloadProviderPdf } from "@/lib/api";
import type { ExportFormat } from "@/lib/api";
import { Download } from "lucide-react";
import { DashboardSkeleton } from "@/components/Skeleton";

interface Stats {
  size: number;
  entries: number;
  lastSummarized: string | null;
  summaryVersion: number | null;
  byCategory?: { category: string; count: number; size: number }[];
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
  const [downloadingSummary, setDownloadingSummary] = useState<"pdf" | "md" | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);

  async function handleExport(asFullData = false) {
    setExporting(true);
    try {
      if (asFullData) {
        const data = await getExportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `health-memory-ai-full-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await downloadExport("json");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportFormat(format: ExportFormat) {
    setExporting(true);
    try {
      await downloadExport(format);
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

      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
        <strong>Your data:</strong> You can download all your data at any time below. Export includes events and latest summary.
      </div>

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
          {stats?.lastSummarized && (
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  setDownloadingSummary("pdf");
                  try {
                    await downloadSummary("pdf");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Download failed");
                  } finally {
                    setDownloadingSummary(null);
                  }
                }}
                disabled={downloadingSummary !== null}
                className="flex items-center gap-2 rounded-lg border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloadingSummary === "pdf" ? "..." : "Summary (PDF)"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDownloadingSummary("md");
                  try {
                    await downloadSummary("md");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Download failed");
                  } finally {
                    setDownloadingSummary(null);
                  }
                }}
                disabled={downloadingSummary !== null}
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloadingSummary === "md" ? "..." : "Summary (MD)"}
              </button>
            </div>
          )}
        </div>
        {stats?.byCategory && stats.byCategory.length > 0 && (
          <div className="glass-panel glass-panel-glow rounded-xl p-4 sm:col-span-2 animate-fade-slide-up [animation-delay:0.25s]">
            <p className="text-sm font-medium text-[var(--text-muted)] mb-3">Storage by category</p>
            <div className="space-y-2">
              {stats.byCategory.map(({ category, count, size }) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg bg-midnight/50 border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {category.replace(/_/g, " ")}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {count} {count === 1 ? "entry" : "entries"} · {formatBytes(size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {stats && stats.entries < 20 && (
        <div className="mt-6 glass-panel rounded-xl p-4 border border-neon-cyan/20 animate-fade-slide-up [animation-delay:0.3s]">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Tips to get more from your health memory</p>
          <ul className="text-sm text-[var(--text-muted)] space-y-1 list-disc list-inside">
            {stats.entries === 0 && (
              <li>Add your first memory — paste a note, upload a lab result, or record a voice note.</li>
            )}
            {stats.entries > 0 && stats.entries < 5 && (
              <li>Add a few more entries (e.g. lab results, medications, visit notes) to build context.</li>
            )}
            {stats.entries >= 5 && stats.entries < 20 && (
              <li>Try summarizing after you have around 20 entries for a useful condensed view.</li>
            )}
            {stats.entries < 20 && (
              <li>Use tags (e.g. &quot;cardiologist&quot;, &quot;2024 physical&quot;) to filter and find things later.</li>
            )}
          </ul>
          <Link
            href="/upload"
            className="mt-3 inline-block text-sm font-medium text-neon-cyan hover:underline"
          >
            Add memory →
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleExport(false)}
          disabled={exporting || (stats?.entries ?? 0) === 0}
          className="flex items-center gap-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export (JSON)"}
        </button>
        <button
          type="button"
          onClick={() => handleExportFormat("csv")}
          disabled={exporting || (stats?.entries ?? 0) === 0}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
        >
          <Download className="h-4 w-4" />
          Export (CSV)
        </button>
        <button
          type="button"
          onClick={() => handleExportFormat("pdf")}
          disabled={exporting || (stats?.entries ?? 0) === 0}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
        >
          <Download className="h-4 w-4" />
          Export (PDF)
        </button>
        <button
          type="button"
          onClick={() => handleExport(true)}
          disabled={exporting || (stats?.entries ?? 0) === 0}
          title="Download a complete copy of your health memory data (events + summary)"
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50 transition-all"
        >
          Download all my data
        </button>
        {(stats?.entries ?? 0) === 0 && (
          <Link
            href="/upload"
            className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all"
          >
            Add your first memory
          </Link>
        )}
        <div className="flex flex-wrap gap-2 border-l border-white/20 pl-3">
          <span className="text-sm text-[var(--text-muted)] w-full sm:w-auto">Share with provider:</span>
          <button
            type="button"
            onClick={async () => {
              setShareLinkError(null);
              try {
                const { url } = await createShareLink();
                await navigator.clipboard.writeText(url);
                setShareLinkCopied(true);
                setTimeout(() => setShareLinkCopied(false), 2000);
              } catch (e) {
                setShareLinkError(e instanceof Error ? e.message : "Failed to create link");
              }
            }}
            disabled={(stats?.entries ?? 0) === 0}
            className="rounded-lg border border-neon-cyan/50 px-3 py-1.5 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
          >
            {shareLinkCopied ? "Copied!" : "Copy read-only link"}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadProviderPdf();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Download failed");
              }
            }}
            disabled={(stats?.entries ?? 0) === 0}
            title="Summarized quick-review PDF for your doctor: clinical summary plus date/category timeline (no raw event text)"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 disabled:opacity-50"
          >
            Download PDF for provider
          </button>
          {shareLinkError && (
            <p className="text-xs text-red-400 w-full">{shareLinkError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
