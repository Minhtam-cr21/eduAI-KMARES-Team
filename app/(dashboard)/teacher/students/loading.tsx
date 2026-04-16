function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function TeacherStudentsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Block className="h-8 w-40" />
        <Block className="h-4 w-96" />
      </div>
      <Block className="h-[420px] w-full" />
    </div>
  );
}
