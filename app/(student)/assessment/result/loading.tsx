function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function AssessmentResultLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-3 text-center">
        <Block className="mx-auto h-8 w-72" />
        <Block className="mx-auto h-4 w-96" />
      </div>
      <div className="mt-8 space-y-6">
        <Block className="h-40 w-full" />
        <Block className="h-64 w-full" />
        <Block className="h-72 w-full" />
        <Block className="h-64 w-full" />
      </div>
    </main>
  );
}
