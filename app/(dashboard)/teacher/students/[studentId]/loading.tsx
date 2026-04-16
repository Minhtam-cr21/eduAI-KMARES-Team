function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function TeacherStudentWorkspaceLoading() {
  return (
    <div className="space-y-6">
      <Block className="h-6 w-32" />
      <div className="flex items-center gap-3">
        <Block className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Block className="h-7 w-48" />
          <Block className="h-4 w-72" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <Block className="h-56 w-full lg:col-span-2" />
        <Block className="h-40 w-full" />
        <Block className="h-40 w-full" />
      </div>
      <Block className="h-12 w-80" />
      <Block className="h-[420px] w-full" />
    </div>
  );
}
