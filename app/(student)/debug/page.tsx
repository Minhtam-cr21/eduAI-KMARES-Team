import { DebuggerExerciseClient } from "@/components/student/debugger-exercise-client";
import { BackButton } from "@/components/ui/back-button";
import { Suspense } from "react";

function DebugFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        <p className="text-sm text-muted-foreground">Đang tải debugger…</p>
      </div>
    </div>
  );
}

export default function StudentDebugPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <BackButton fallbackHref="/student" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Debugger (thực hành)
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cột trái: đề bài và gợi ý. Cột phải: soạn code, chạy qua server (Judge0),
          hỏi AI qua API nội bộ. Thêm{" "}
          <code className="rounded bg-muted px-1 text-xs">?exerciseId=UUID</code>{" "}
          để gắn bài tập.
        </p>
      </div>

      <Suspense fallback={<DebugFallback />}>
        <DebuggerExerciseClient />
      </Suspense>
    </main>
  );
}
