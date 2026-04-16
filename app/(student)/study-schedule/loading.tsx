function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function StudyScheduleLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Block className="h-8 w-56" />
        <div className="flex gap-2">
          <Block className="h-9 w-24" />
          <Block className="h-9 w-28" />
        </div>
      </div>
      <div className="space-y-8">
        <Block className="h-52 w-full" />
        <Block className="h-56 w-full" />
        <Block className="h-80 w-full" />
      </div>
    </main>
  );
}
