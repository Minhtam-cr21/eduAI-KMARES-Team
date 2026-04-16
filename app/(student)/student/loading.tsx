function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function StudentSectionLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Block className="mb-4 h-9 w-28" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Block className="h-8 w-48" />
          <Block className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Block className="h-9 w-36" />
          <Block className="h-9 w-24" />
        </div>
      </div>
      <div className="space-y-4">
        <Block className="h-28 w-full" />
        <Block className="h-28 w-full" />
      </div>
    </main>
  );
}
