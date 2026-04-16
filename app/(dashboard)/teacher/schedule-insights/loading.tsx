function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function TeacherScheduleInsightsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-[32rem]" />
      </div>
      <Block className="h-36 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Block className="h-72 w-full" />
        <Block className="h-72 w-full" />
      </div>
      <Block className="h-80 w-full" />
    </div>
  );
}
