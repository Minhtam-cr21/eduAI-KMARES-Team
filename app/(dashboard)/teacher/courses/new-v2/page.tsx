"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/ui/back-button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function TeacherNewEduV2CoursePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      const body = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        category: String(fd.get("category") ?? "").trim() || null,
        level: (fd.get("level") as string) || "beginner",
        language: String(fd.get("language") ?? "vi").trim() || "vi",
      };
      if (!body.title) {
        toast.error("Nhập tiêu đề khóa học");
        return;
      }
      const res = await fetch("/api/v2/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Không tạo được");
        return;
      }
      if (!j.id) {
        toast.error("Thieu id phan hoi");
        return;
      }
      toast.success("Đã tạo khóa học (Edu V2)");
      router.push(`/teacher/courses/${j.id}/edit-v2`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackButton fallbackHref="/teacher/courses" className="mb-2" />
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Tạo khóa học (Edu V2)
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cấu trúc: Course → Module → Lesson → LessonContent. Sau khi tạo, bạn
          se chinh sua chuong va noi dung.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={(fd) => void onSubmit(fd)}>
            <div>
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input id="title" name="title" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" name="description" className="mt-1" rows={3} />
            </div>
            <div>
              <Label htmlFor="category">Danh mục (text)</Label>
              <Input id="category" name="category" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="level">Cấp độ</Label>
              <select
                id="level"
                name="level"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="beginner"
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </div>
            <div>
              <Label htmlFor="language">Ngôn ngữ</Label>
              <Input id="language" name="language" defaultValue="vi" className="mt-1" />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Dang tao…" : "Tao va mo trinh chinh sua"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
