"use client";

import { useEffect, useState } from "react";
import { getEvents } from "@/lib/api";
import type { HealthEvent } from "@/lib/types";

export default function TimelinePage() {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
          Health Timeline
        </h1>
        <p className="text-[var(--text-muted)]">Loading...</p>
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
      <p className="text-[var(--text-muted)] mb-6">
        Your health events in chronological order. Timeline-first navigation.
      </p>

      {events.length === 0 ? (
        <div className="glass-panel rounded-xl border-dashed border-white/20 p-8 text-center text-[var(--text-muted)]">
          No memories yet. Add your first memory from the Add Memory screen.
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((event, i) => (
            <div
              key={event.id}
              className="flex gap-4 border-b border-white/10 py-4 last:border-0 animate-fade-slide-up"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
