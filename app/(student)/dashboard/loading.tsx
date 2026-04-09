function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-lg ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <ul className="flex flex-col gap-6">
        {[1, 2].map((i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-3 h-4 w-full max-w-md" />
            <div className="mt-4 border-t border-border pt-4">
              <Skeleton className="mb-3 h-3 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
