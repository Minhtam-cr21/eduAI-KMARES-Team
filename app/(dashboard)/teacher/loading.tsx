function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function TeacherDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-80" />
      </div>
      <div className="flex gap-2">
        <Block className="h-10 w-28" />
        <Block className="h-10 w-40" />
        <Block className="h-10 w-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block className="h-80 w-full" />
        <Block className="h-80 w-full" />
      </div>
    </div>
  );
}
