"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Pencil, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function splitList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

interface ProfileData {
  email: string;
  userId: string;
  role: string | null;
  fullName: string | null;
  createdAt: string | null;
  goal: string | null;
  hoursPerDay: number | null;
  preferredLearning: string | null;
  birthYear: number | null;
  school: string | null;
  className: string | null;
  mbtiType: string | null;
  learningStyle: string | null;
  onboardingCompleted: boolean;
  careerOrientation: string | null;
  assessmentCompleted: boolean;
  strengths: string[] | null;
  weaknesses: string[] | null;
}

export function ProfileForm({ data }: { data: ProfileData }) {
  const router = useRouter();
  const [goal, setGoal] = useState(data.goal ?? "");
  const [hours, setHours] = useState(String(data.hoursPerDay ?? ""));
  const [preferred, setPreferred] = useState(data.preferredLearning ?? "");
  const [strengthsText, setStrengthsText] = useState(
    (data.strengths ?? []).join(", ")
  );
  const [weaknessesText, setWeaknessesText] = useState(
    (data.weaknesses ?? []).join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (goal.trim() !== (data.goal ?? "")) body.goal = goal.trim();
      const h = parseInt(hours, 10);
      if (!isNaN(h) && h !== data.hoursPerDay) body.hours_per_day = h;
      if (preferred.trim() !== (data.preferredLearning ?? ""))
        body.preferred_learning = preferred.trim();

      const nextS = splitList(strengthsText);
      const prevS = data.strengths ?? [];
      if (JSON.stringify(nextS) !== JSON.stringify(prevS)) {
        body.strengths = nextS;
      }
      const nextW = splitList(weaknessesText);
      const prevW = data.weaknesses ?? [];
      if (JSON.stringify(nextW) !== JSON.stringify(prevW)) {
        body.weaknesses = nextW;
      }

      if (Object.keys(body).length === 0) {
        toast.info("Không có thay đổi.");
        return;
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Lỗi cập nhật", { description: j.error });
        return;
      }
      toast.success("Đã cập nhật hồ sơ.");
      router.refresh();
    } catch (err) {
      toast.error("Lỗi mạng", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetAssessment() {
    if (
      !window.confirm(
        "Xóa kết quả trắc nghiệm hiện tại và làm lại từ đầu? Hành động không thể hoàn tác."
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/assessment/reset", { method: "POST" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error("Không reset được", { description: j.error });
        return;
      }
      toast.success("Đã xóa kết quả. Bạn có thể làm bài test lại.");
      router.refresh();
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setResetting(false);
    }
  }

  const initials = (data.fullName ?? data.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-bold text-white">
            {initials || <User className="h-8 w-8" />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">
              {data.fullName ?? "Chưa đặt tên"}
            </h2>
            <p className="text-sm text-muted-foreground">{data.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="outline" className="capitalize">
                {data.role ?? "student"}
              </Badge>
              {data.mbtiType && (
                <Badge className="bg-violet-600 text-white hover:bg-violet-700">
                  {data.mbtiType}
                </Badge>
              )}
              {data.onboardingCompleted && (
                <Badge variant="secondary">Onboarding ✓</Badge>
              )}
              {data.assessmentCompleted && (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                  Đã làm trắc nghiệm
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(data.careerOrientation || data.assessmentCompleted) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trắc nghiệm & định hướng</CardTitle>
            <CardDescription>Kết quả từ bài test trên EduAI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.careerOrientation ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Định hướng nghề (tóm tắt)
                </p>
                <p className="mt-1 text-foreground">{data.careerOrientation}</p>
              </div>
            ) : null}
            {data.assessmentCompleted ? (
              <button
                type="button"
                disabled={resetting}
                onClick={() => void handleResetAssessment()}
                className={cn(
                  "rounded-lg border border-border px-4 py-2 text-sm font-medium transition",
                  "hover:bg-muted disabled:opacity-60"
                )}
              >
                {resetting ? "Đang xử lý…" : "Làm lại bài test"}
              </button>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>Chỉ đọc — cập nhật qua onboarding hoặc admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">User ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-foreground">
                {data.userId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Tạo lúc</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {data.createdAt
                  ? new Date(data.createdAt).toLocaleString("vi-VN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Năm sinh</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {data.birthYear ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Trường</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {data.school ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Lớp</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {data.className ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Phong cách học</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {data.learningStyle ?? "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Mục tiêu học tập
          </CardTitle>
          <CardDescription>Cập nhật mục tiêu và sở thích học.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Mục tiêu</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ví dụ: Học web development, thi đại học..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hours">Giờ/ngày (1–8)</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={8}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred">Phương pháp ưa thích</Label>
              <Input
                id="preferred"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
                placeholder="video, text, practice..."
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="strengths">Điểm mạnh (phân cách bằng dấu phẩy hoặc xuống dòng)</Label>
              <Textarea
                id="strengths"
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
                className="min-h-[72px]"
                placeholder="ví dụ: tư duy logic, kiên trì"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="weaknesses">Điểm cần cải thiện</Label>
              <Textarea
                id="weaknesses"
                value={weaknessesText}
                onChange={(e) => setWeaknessesText(e.target.value)}
                className="min-h-[72px]"
                placeholder="ví dụ: quản lý thời gian"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-semibold transition",
              "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            )}
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
