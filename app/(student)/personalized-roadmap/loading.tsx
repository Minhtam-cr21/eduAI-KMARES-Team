function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function PersonalizedRoadmapLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Block className="h-7 w-48" />
          <Block className="h-4 w-56" />
        </div>
        <div className="mt-6 space-y-4">
          <Block className="h-16 w-full" />
          <Block className="h-16 w-full" />
          <div className="flex gap-2">
            <Block className="h-9 w-28" />
            <Block className="h-9 w-32" />
          </div>
        </div>
      </div>
    </main>
  );
}
