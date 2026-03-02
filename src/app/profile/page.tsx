"use client";

import { useState, useEffect } from "react";

type ProfileForm = {
  displayName: string;
  firstName: string;
  lastName: string;
  preferredGreeting: string;
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    firstName: "",
    lastName: "",
    preferredGreeting: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data) {
          setForm({
            displayName: data.displayName ?? "",
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            preferredGreeting: data.preferredGreeting ?? "",
          });
        }
      } catch {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load profile." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim() || undefined,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          preferredGreeting: form.preferredGreeting.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to update profile." });
        return;
      }
      setMessage({ type: "success", text: "Profile saved. You’ll be greeted by name on the home page." });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl animate-fade-slide-up">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Profile</h1>
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Profile</h1>
      <p className="text-[var(--text-muted)] mb-6">
        Set your display name and optional greeting. We use this to personalize your experience when you sign in.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-panel glass-panel-glow rounded-xl p-4 space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Alex"
              className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Shown in greetings (e.g. “Hello, Alex”).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-[var(--text-muted)] mb-1"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-[var(--text-muted)] mb-1"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="preferredGreeting"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Preferred greeting
            </label>
            <input
              id="preferredGreeting"
              type="text"
              value={form.preferredGreeting}
              onChange={(e) => setForm((f) => ({ ...f, preferredGreeting: e.target.value }))}
              placeholder="e.g. Hey, or leave blank for default"
              className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Optional. We’ll use “Hello” or your display/first name if blank.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 glass-panel rounded-xl p-3 text-sm ${
            message.type === "success"
              ? "border-neon-cyan/30 text-neon-cyan"
              : "border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
