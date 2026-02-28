export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-96 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-panel glass-panel-glow rounded-xl p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="glass-panel glass-panel-glow rounded-xl p-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="glass-panel glass-panel-glow rounded-xl p-4 sm:col-span-2">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-80 mb-6" />
      <div className="space-y-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-white/10 py-4 last:border-0"
          >
            <Skeleton className="h-4 w-24 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummarizeSkeleton() {
  return (
    <div className="max-w-2xl animate-fade-slide-up">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-96 mb-6" />
      <div className="glass-panel glass-panel-glow rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
