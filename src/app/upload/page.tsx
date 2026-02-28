"use client";

import { useState, useRef } from "react";
import { ingestText, ingestFile } from "@/lib/api";

const CATEGORIES = [
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
] as const;

type InputMode = "text" | "file";

export default function UploadPage() {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("note");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    mode === "text" ? text.trim().length > 0 : file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      if (mode === "file" && file) {
        await ingestFile(file, category);
      } else {
        await ingestText(text.trim(), category);
      }
      setStatus("success");
      setMessage("Memory added successfully.");
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to add memory");
    }
  }

  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Add Memory</h1>
      <p className="text-[var(--text-muted)] mb-6">
        Add text, notes, or upload files. All data is stored privately in your
        health memory.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-panel glass-panel-glow rounded-xl p-4">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Category
          </label>
          <select
            id="category"
            data-testid="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-panel glass-panel-glow rounded-xl p-4">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "text"
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "file"
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              Upload file
            </button>
          </div>

          {mode === "text" ? (
            <textarea
              id="content"
              data-testid="content-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste or type your health-related note..."
              className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
            />
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                data-testid="file-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neon-cyan/20 file:text-neon-cyan file:border file:border-neon-cyan/50 hover:file:bg-neon-cyan/30"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Accepts .txt and .pdf files. PDF text will be extracted automatically.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !canSubmit}
          data-testid="add-memory-btn"
          className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {status === "loading" ? "Adding..." : "Add Memory"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 glass-panel rounded-xl p-3 text-sm ${
            status === "success"
              ? "border-neon-cyan/30 text-neon-cyan"
              : "border-red-500/30 text-red-400"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
