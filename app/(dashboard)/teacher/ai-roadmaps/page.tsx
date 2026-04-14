import { TeacherAiRoadmapsClient } from "@/components/teacher/teacher-ai-roadmaps-client";

export const dynamic = "force-dynamic";

export default function TeacherAiRoadmapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Lộ trình AI
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Duyệt hoặc từ chối các lộ trình do học sinh tạo từ AI (trạng thái chờ duyệt).
        </p>
      </div>
      <TeacherAiRoadmapsClient />
    </div>
  );
}
