"use client";

import { useState, useRef, useCallback } from "react";
import { ingestText, ingestFile } from "@/lib/api";
import { Mic, Square } from "lucide-react";

const CATEGORIES = [
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
] as const;

type InputMode = "text" | "file" | "record";

export default function UploadPage() {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("note");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmit =
    mode === "text" ? text.trim().length > 0 : mode === "file" ? file !== null : false;

  const stopRecordTimer = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordSeconds(0);
  }, []);

  async function startRecording() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopRecordTimer();
        setIsRecording(false);

        // Defer so the final dataavailable (with remaining audio) has fired in all browsers
        setTimeout(async () => {
          if (chunksRef.current.length === 0) {
            setMessage("No audio recorded. Try recording for at least 2 seconds.");
            return;
          }
          const blob = new Blob(chunksRef.current, { type: mimeType });

          // Reject very short recordings that often transcribe as filler words
          const minBytes = 5000;
          if (blob.size < minBytes) {
            setMessage("Recording too short. Please record at least 2–3 seconds of speech.");
            return;
          }

          const audioFile = new File([blob], `voice-note-${Date.now()}.webm`, {
            type: mimeType,
          });
          setStatus("loading");
          try {
            await ingestFile(audioFile, "voice_transcript");
            setStatus("success");
            setMessage("Voice note added successfully.");
          } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Failed to add voice note");
          }
        }, 150);
      };

      // Request data every 250ms so we capture all audio; some browsers only flush on stop()
      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Microphone access denied or not available."
      );
      setStatus("error");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function handleModeChange(newMode: InputMode) {
    if (isRecording) return;
    setMode(newMode);
    setMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((mode !== "text" && mode !== "file") || !canSubmit || status === "loading") return;
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
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleModeChange("text")}
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
              onClick={() => handleModeChange("file")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "file"
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("record")}
              disabled={isRecording}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                mode === "record"
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              <Mic className="h-4 w-4" />
              Record voice
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
          ) : mode === "record" ? (
            <div className="space-y-4 py-4">
              {typeof navigator !== "undefined" &&
              navigator.mediaDevices &&
              typeof navigator.mediaDevices.getUserMedia === "function" ? (
                <>
                  {!isRecording && status !== "loading" ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-3 rounded-xl bg-red-500/20 border border-red-500/50 px-6 py-4 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      <Mic className="h-8 w-8" />
                      <span className="font-medium">Start recording</span>
                    </button>
                  ) : isRecording ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                        <span className="font-mono text-sm">
                          {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      Processing and transcribing your voice note…
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    Record for at least 2–3 seconds. Audio is transcribed and saved as a voice note.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Voice recording is not supported in this browser. Use &quot;Upload file&quot; to add an audio file instead.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.mp3,.wav,.m4a,.webm,audio/*,.png,.jpg,.jpeg,.webp,.gif,image/*"
                data-testid="file-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neon-cyan/20 file:text-neon-cyan file:border file:border-neon-cyan/50 hover:file:bg-neon-cyan/30"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Accepts .txt, .pdf, audio (mp3, wav, m4a, webm), and images (png, jpg, webp). Text is extracted automatically.
              </p>
            </div>
          )}
        </div>

        {mode !== "record" && (
          <button
            type="submit"
            disabled={status === "loading" || !canSubmit}
            data-testid="add-memory-btn"
            className="rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 px-4 py-2 text-sm font-medium text-neon-cyan hover:bg-neon-cyan/30 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {status === "loading" ? "Adding..." : "Add Memory"}
          </button>
        )}
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
