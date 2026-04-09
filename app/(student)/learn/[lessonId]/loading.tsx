function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-lg ${className ?? ""}`}
    />
  );
}

export default function LessonLoading() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-9 w-3/4" />

      <div className="mt-8 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
    </article>
  );
}
