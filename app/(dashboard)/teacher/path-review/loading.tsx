function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function TeacherPathReviewLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Block className="h-8 w-48" />
        <Block className="h-4 w-[30rem]" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Block className="h-56 w-full" />
        <Block className="h-56 w-full" />
      </div>
    </div>
  );
}
