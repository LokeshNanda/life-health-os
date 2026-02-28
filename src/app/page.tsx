import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Health Memory AI
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
      </div>
    </div>
  );
}
