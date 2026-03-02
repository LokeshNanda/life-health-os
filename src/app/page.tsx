"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  displayName?: string;
  firstName?: string;
  preferredGreeting?: string;
} | null;

function greeting(profile: Profile): string {
  const name = profile?.displayName?.trim() || profile?.firstName?.trim();
  const pref = profile?.preferredGreeting?.trim();
  if (name && pref) return `${pref}, ${name}`;
  if (name) return `Hello, ${name}`;
  if (pref) return pref;
  return "Hello";
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") setProfile(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        {greeting(profile)}
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        Your personal health knowledge base. Organize medical history, preserve
        context with AI summaries, and query your data in natural language.
      </p>
      <div className="glass-panel rounded-xl p-4 text-sm text-amber-200/90 border border-amber-500/30">
        <strong>Disclaimer:</strong> This app is for information organization
        only. It does NOT provide medical advice, diagnose conditions, or
        recommend treatments.
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/upload"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.1s]"
        >
          <span className="font-medium text-neon-cyan">Add Memory</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Upload documents, add notes, or paste text
          </p>
        </Link>
        <Link
          href="/timeline"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.15s]"
        >
          <span className="font-medium text-neon-cyan">Health Timeline</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            View your health events chronologically
          </p>
        </Link>
        <Link
          href="/chat"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.2s]"
        >
          <span className="font-medium text-neon-cyan">AI Chat</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ask questions about your health records
          </p>
        </Link>
        <Link
          href="/summarize"
          className="glass-panel glass-panel-glow rounded-xl p-4 transition-all duration-300 hover:border-neon-cyan/40 hover:shadow-glow-soft animate-fade-slide-up [animation-delay:0.25s]"
        >
          <span className="font-medium text-neon-cyan">Summarize</span>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create a condensed summary of your records
          </p>
        </Link>
      </div>
    </div>
  );
}
