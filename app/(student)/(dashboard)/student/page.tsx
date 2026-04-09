"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

type HubStats = {
  coursesCount: number | null;
  requestsCount: number | null;
  mbtiLabel: string;
  exercisesPreview: number | null;
};

export default function StudentHubPage() {
  const [stats, setStats] = useState<HubStats>({
    coursesCount: null,
    requestsCount: null,
    mbtiLabel: "…",
    exercisesPreview: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [coursesRes, connRes, mbtiRes, exRes] = await Promise.all([
          fetch("/api/courses?page=1&limit=1"),
          fetch("/api/connection-requests/student"),
          fetch("/api/mbti/status"),
          fetch("/api/practice/exercises?page=1&limit=5"),
        ]);

        const coursesJson = coursesRes.ok
          ? ((await coursesRes.json()) as { count?: number })
          : {};
        const connJson = connRes.ok
          ? ((await connRes.json()) as unknown[])
          : [];
        const mbtiJson = mbtiRes.ok
          ? ((await mbtiRes.json()) as {
              can_retest?: boolean;
              last_test?: string | null;
            })
          : {};
        const exJson = exRes.ok
          ? ((await exRes.json()) as { count?: number })
          : {};

        if (cancelled) return;
        setStats({
          coursesCount: typeof coursesJson.count === "number" ? coursesJson.count : null,
          requestsCount: Array.isArray(connJson) ? connJson.length : null,
          mbtiLabel: mbtiJson.last_test
            ? mbtiJson.can_retest
              ? "Có thể làm lại"
              : "Đã làm gần đây"
            : "Chưa làm",
          exercisesPreview:
            typeof exJson.count === "number" ? exJson.count : null,
        });
      } catch {
        if (!cancelled) {
          setStats((s) => ({ ...s, mbtiLabel: "—" }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: {
    title: string;
    description: string;
    href: string;
    cta: string;
    extraHref?: string;
    extraLabel?: string;
  }[] = [
    {
      title: "Khóa học của tôi",
      description:
        stats.coursesCount != null
          ? `${stats.coursesCount} khóa đang mở (đã xuất bản)`
          : "Danh sách khóa học đã xuất bản",
      href: "/student/courses",
      cta: "Xem khóa học",
    },
    {
      title: "Kết nối giáo viên",
      description:
        stats.requestsCount != null
          ? `${stats.requestsCount} yêu cầu đã gửi`
          : "Gửi hoặc theo dõi yêu cầu kết nối",
      href: "/student/connections",
      cta: "Mở",
    },
    {
      title: "MBTI test",
      description: stats.mbtiLabel,
      href: "/student/mbti",
      cta: "Làm bài",
    },
    {
      title: "Phòng luyện code",
      description:
        stats.exercisesPreview != null
          ? `${stats.exercisesPreview} bài trong kho — random tại phòng luyện hoặc chọn đề cụ thể.`
          : "Luyện tập ngẫu nhiên hoặc chọn bài theo danh sách.",
      href: "/practice",
      cta: "Vào phòng luyện",
      extraHref: "/student/practice",
      extraLabel: "Danh sách bài",
    },
    {
      title: "Profile",
      description: "Thông tin cá nhân và cài đặt",
      href: "/profile",
      cta: "Mở profile",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bảng điều khiển học sinh
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Truy cập nhanh các khu vực học tập và luyện tập.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.href}>
            <CardHeader>
              <CardTitle className="text-lg">{c.title}</CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href={c.href}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                {c.cta}
              </Link>
              {c.extraHref && c.extraLabel ? (
                <Link
                  href={c.extraHref}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  {c.extraLabel}
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Lộ trình học tập chi tiết:{" "}
        <Link href="/dashboard" className="text-primary font-medium underline-offset-4 hover:underline">
          Dashboard lộ trình
        </Link>
      </p>
    </main>
  );
}
