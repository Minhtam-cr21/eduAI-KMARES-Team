"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GOAL_OPTIONS = [
  "Web development",
  "Data science",
  "Game development",
  "Mobile app",
  "Other",
] as const;

const onboardingSchema = z.object({
  goal: z.enum(GOAL_OPTIONS),
  hours_per_day: z.coerce.number().int().min(1).max(8),
  preferred_learning: z.enum(["Video", "Text"]),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

function isOnboardingComplete(p: {
  goal: string | null;
  hours_per_day: number | null;
}): boolean {
  const g = p.goal?.trim();
  const h = p.hours_per_day;
  return (
    Boolean(g) &&
    typeof h === "number" &&
    Number.isFinite(h) &&
    h >= 1 &&
    h <= 8
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingValues>,
    defaultValues: {
      goal: "Web development",
      hours_per_day: 2,
      preferred_learning: "Video",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = (await res.json()) as {
          profile?: { goal: string | null; hours_per_day: number | null };
        };
        if (!res.ok || !data.profile) {
          if (!cancelled) setChecking(false);
          return;
        }
        if (isOnboardingComplete(data.profile)) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        toast.error("Không tải được profile.");
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(values: OnboardingValues) {
    try {
      const putRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: values.goal,
          hours_per_day: values.hours_per_day,
          preferred_learning: values.preferred_learning,
        }),
      });
      const putData = (await putRes.json()) as { error?: string };
      if (!putRes.ok) {
        toast.error("Không lưu được profile", {
          description: putData.error ?? putRes.statusText,
        });
        return;
      }

      const genRes = await fetch("/api/user/generate-learning-path", {
        method: "POST",
      });
      const genData = (await genRes.json()) as { error?: string; message?: string };
      if (!genRes.ok) {
        toast.error("Không tạo được lộ trình", {
          description: genData.error ?? genRes.statusText,
        });
        return;
      }
      if (genData.message) {
        toast.success(genData.message);
      }
      router.push("/dashboard");
    } catch (e) {
      toast.error("Lỗi mạng", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (checking) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-muted-foreground text-center text-sm">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Chào mừng đến EduAI</CardTitle>
          <CardDescription>
            Chọn mục tiêu và thói quen học để bắt đầu.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Mục tiêu học tập</Label>
              <Controller
                name="goal"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mục tiêu" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.goal && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.goal.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Số giờ học mỗi ngày (1–8)</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={8}
                {...form.register("hours_per_day")}
              />
              {form.formState.errors.hours_per_day && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.hours_per_day.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sở thích học</Label>
              <Controller
                name="preferred_learning"
                control={form.control}
                render={({ field }) => (
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="h-4 w-4 border-border"
                        checked={field.value === "Video"}
                        onChange={() => field.onChange("Video")}
                      />
                      Video
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        className="h-4 w-4 border-border"
                        checked={field.value === "Text"}
                        onChange={() => field.onChange("Text")}
                      />
                      Text
                    </label>
                  </div>
                )}
              />
              {form.formState.errors.preferred_learning && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.preferred_learning.message}
                </p>
              )}
            </div>
          </CardContent>
          <div className="flex items-center border-t border-border p-4 pt-0">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu…" : "Tiếp tục"}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
