import { PersonalizedPathEditorClient } from "@/components/teacher/personalized-path-editor-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { loadTeacherPersonalizedPathEditorData } from "@/lib/teacher/personalized-path-editor";

export default async function TeacherPersonalizedPathStudentPage({
  params,
}: {
  params: { studentId: string };
}) {
  const studentId = params.studentId;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const initialData =
    user && studentId
      ? await loadTeacherPersonalizedPathEditorData({
          supabase,
          userId: user.id,
          studentId,
          isAdmin: me?.role === "admin",
        })
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa lộ trình</CardTitle>
          <CardDescription>
            Khi mở trang, hệ thống gọi gợi ý AI (API suggest) nếu chưa có lộ
            trình. Bạn có thể kéo thả đổi thứ tự, chỉnh hạn ngày, rồi lưu hoặc
            gửi cho học sinh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentId ? (
            <PersonalizedPathEditorClient
              studentId={studentId}
              initialData={initialData?.data ?? null}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Thiếu mã học sinh.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
