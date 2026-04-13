"use client";

import { PersonalizedPathEditorClient } from "@/components/teacher/personalized-path-editor-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function TeacherPersonalizedPathStudentPage() {
  const params = useParams();
  const studentId =
    typeof params.studentId === "string" ? params.studentId : "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa lộ trình</CardTitle>
          <CardDescription>
            Kéo thả để đổi thứ tự khóa, chỉnh ngày tích luỹ, rồi lưu hoặc gửi
            cho học sinh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentId ? (
            <PersonalizedPathEditorClient studentId={studentId} />
          ) : (
            <p className="text-sm text-muted-foreground">Thiếu mã học sinh.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
