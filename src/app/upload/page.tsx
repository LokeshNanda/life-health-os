"use client";

import { useState, useRef, useCallback } from "react";
import { ingestText, ingestFile } from "@/lib/api";
import { Mic, Square, Upload } from "lucide-react";
import { TagInput } from "@/components/TagInput";

const CATEGORIES = [
  "note",
  "medical_event",
  "medication",
  "lab_result",
  "document",
  "voice_transcript",
] as const;

const FILE_ACCEPT = ".txt,.pdf,.mp3,.wav,.m4a,.webm,audio/*,.png,.jpg,.jpeg,.webp,.gif,image/*";

type InputMode = "text" | "file" | "record";

function isAcceptedFile(file: File): boolean {
  const t = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (t.startsWith("text/") || name.endsWith(".txt")) return true;
  if (t === "application/pdf" || name.endsWith(".pdf")) return true;
  if (t.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".webm"].some((e) => name.endsWith(e))) return true;
  if (t.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((e) => name.endsWith(e))) return true;
  return false;
}

export default function UploadPage() {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("note");
  const [tags, setTags] = useState<string[]>([]);
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD for date input
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSubmit =
    mode === "text"
      ? text.trim().length > 0
      : mode === "file"
        ? file !== null || files.length > 0
        : false;

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
            const ts = entryDate ? `${entryDate}T12:00:00.000Z` : undefined;
            await ingestFile(audioFile, "voice_transcript", ts);
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
    setIsDragOver(false);
  }

  function handleFileDrop(e: React.DragEvent, forText: boolean) {
    e.preventDefault();
    setIsDragOver(false);
    const list = e.dataTransfer?.files;
    if (!list?.length) return;
    if (forText) {
      const f = list[0];
      if (f.type.startsWith("text/") || f.name.toLowerCase().endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = () => {
          setText(String(reader.result ?? ""));
          setMessage("");
        };
        reader.readAsText(f);
      } else {
        setMode("file");
        setFiles(Array.from(list).filter(isAcceptedFile));
        setFile(list.length === 1 && isAcceptedFile(list[0]) ? list[0] : null);
      }
    } else {
      const accepted = Array.from(list).filter(isAcceptedFile);
      if (accepted.length === 1) {
        setFile(accepted[0]);
        setFiles([]);
      } else if (accepted.length > 1) {
        setFiles(accepted);
        setFile(null);
      } else if (list.length > 0 && isAcceptedFile(list[0])) {
        setFile(list[0]);
        setFiles([]);
      }
    }
  }

  function handleDragOver(e: React.DragEvent, forText: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (forText) setIsDragOver(e.dataTransfer?.types?.includes("Files") ?? false);
    else setIsDragOver((e.dataTransfer?.types?.includes("Files") && e.dataTransfer?.items?.[0]?.kind === "file") ?? false);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((mode !== "text" && mode !== "file") || status === "loading") return;

    const ts = entryDate ? `${entryDate}T12:00:00.000Z` : undefined;
    const tagList = tags.length > 0 ? tags : undefined;

    if (mode === "file") {
      const toUpload: File[] = files.length > 0 ? files : file ? [file] : [];
      if (toUpload.length === 0) return;

      setStatus("loading");
      setMessage("");
      setBatchResults([]);

      const results: { name: string; ok: boolean; error?: string }[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        setMessage(`Uploading ${i + 1}/${toUpload.length}: ${f.name}`);
        try {
          await ingestFile(f, category, ts, tagList);
          results.push({ name: f.name, ok: true });
        } catch (err) {
          results.push({
            name: f.name,
            ok: false,
            error: err instanceof Error ? err.message : "Failed",
          });
        }
        setBatchResults([...results]);
      }

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      setStatus(failCount === 0 ? "success" : failCount === results.length ? "error" : "success");
      setMessage(
        failCount === 0
          ? `${okCount} file(s) added successfully.`
          : `${okCount} succeeded, ${failCount} failed.`
      );
      setFile(null);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (mode === "text" && !text.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      await ingestText(text.trim(), category, ts, tagList);
      setStatus("success");
      setMessage("Memory added successfully.");
      setText("");
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
          <label
            htmlFor="entry-date"
            className="block text-sm font-medium text-[var(--text-muted)] mt-3 mb-1"
          >
            Date of entry
          </label>
          <input
            id="entry-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-midnight/50 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            When this happened (default: today). Used for timeline order.
          </p>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-[var(--text-muted)] mt-3 mb-1"
          >
            Tags (optional)
          </label>
          <TagInput
            id="tags"
            value={tags}
            onChange={setTags}
            placeholder="e.g. cardiologist, 2024 physical"
            aria-label="Tags for filtering"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Comma-separated or type and press Enter. Used for filtering in timeline and chat.
          </p>
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
            <div
              className={`relative rounded-xl border-2 border-dashed transition-colors ${
                isDragOver ? "border-neon-cyan/50 bg-neon-cyan/10" : "border-white/20 bg-midnight/50"
              }`}
              onDragOver={(e) => handleDragOver(e, true)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleFileDrop(e, true)}
            >
              <textarea
                id="content"
                data-testid="content-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onDragOver={(e) => e.preventDefault()}
                rows={8}
                placeholder="Paste or type your health-related note... or drop a text file here"
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 resize-none"
              />
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-midnight/80 text-neon-cyan text-sm font-medium pointer-events-none">
                  Drop text file or paste here
                </div>
              )}
            </div>
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
            <div
              className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
                isDragOver ? "border-neon-cyan/50 bg-neon-cyan/10" : "border-white/20 bg-midnight/50"
              }`}
              onDragOver={(e) => handleDragOver(e, false)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleFileDrop(e, false)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                multiple
                data-testid="file-input"
                onChange={(e) => {
                  const list = e.target.files;
                  if (!list?.length) return;
                  if (list.length === 1) {
                    setFile(list[0]);
                    setFiles([]);
                  } else {
                    setFiles(Array.from(list).filter(isAcceptedFile));
                    setFile(null);
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 py-6 text-[var(--text-muted)] hover:text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 rounded-lg"
              >
                <Upload className="h-10 w-10" />
                <span className="text-sm font-medium">
                  {files.length > 0
                    ? `${files.length} file(s) selected`
                    : file
                      ? file.name
                      : "Drop files here or click to browse (multiple allowed)"}
                </span>
                {(file || files.length === 1) && (
                  <span className="text-xs">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : files[0] && `${(files[0].size / 1024).toFixed(1)} KB`}
                  </span>
                )}
              </button>
              {batchResults.length > 0 && (
                <ul className="mt-4 space-y-1.5 max-h-32 overflow-y-auto">
                  {batchResults.map((r, i) => (
                    <li
                      key={i}
                      className={`flex items-center justify-between text-xs rounded px-2 py-1 ${
                        r.ok ? "text-neon-cyan bg-neon-cyan/10" : "text-red-400 bg-red-500/10"
                      }`}
                    >
                      <span className="truncate">{r.name}</span>
                      <span>{r.ok ? "OK" : r.error ?? "Failed"}</span>
                    </li>
                  ))}
                </ul>
              )}
              {isDragOver && (
                <p className="text-center text-sm text-neon-cyan mt-2">
                  Release to add this file
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
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
