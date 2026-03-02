"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { HealthEvent } from "@/lib/types";
import { MarkdownViewer } from "@/components/MarkdownViewer";

interface SummaryPayload {
  content: string;
  version: number;
  createdAt: string;
}

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing link");
      setLoading(false);
      return;
    }
    fetch(`/api/share/data?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired link");
        return res.json();
      })
      .then((data) => {
        setEvents(data.events ?? []);
        setSummary(data.summary ?? null);
        setExpiresAt(data.expiresAt ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight p-6 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-midnight p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-[var(--text-muted)]">
            This link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
          Health Memory — Shared with you
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Read-only view. Link expires{" "}
          {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}.
        </p>

        {summary && (
          <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Summary (v{summary.version})
            </h2>
            <MarkdownViewer content={summary.content} className="text-[var(--text-muted)]" />
          </section>
        )}

        <section>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            Timeline ({events.length} {events.length === 1 ? "event" : "events"})
          </h2>
          {events.length === 0 ? (
            <p className="text-[var(--text-muted)]">No events.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium text-neon-cyan">
                      {event.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">
                    <MarkdownViewer content={event.content} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
