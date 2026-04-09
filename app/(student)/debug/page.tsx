import { DebuggerExerciseClient } from "@/components/student/debugger-exercise-client";
import Link from "next/link";
import { Suspense } from "react";

function DebugFallback() {
  return (
    <p className="text-muted-foreground py-12 text-center text-sm">
      Đang tải debugger…
    </p>
  );
}

export default function StudentDebugPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Debugger (thực hành)
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Cột trái: đề bài và gợi ý. Cột phải: soạn code, chạy qua server (Judge0),
            hỏi AI qua API nội bộ. Thêm{" "}
            <code className="bg-muted rounded px-1 text-xs">?exerciseId=UUID</code>{" "}
            để gắn bài tập.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      <Suspense fallback={<DebugFallback />}>
        <DebuggerExerciseClient />
      </Suspense>
    </main>
  );
}
