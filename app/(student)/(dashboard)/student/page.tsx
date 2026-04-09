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

const INITIAL_STATS: HubStats = {
  coursesCount: null,
  requestsCount: null,
  mbtiLabel: "\u2026",
  exercisesPreview: null,
};

const ERROR_STATS: HubStats = {
  coursesCount: null,
  requestsCount: null,
  mbtiLabel: "\u2014",
  exercisesPreview: null,
};

export default function StudentHubPage() {
  const [stats, setStats] = useState<HubStats>(INITIAL_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError(null);
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
          coursesCount:
            typeof coursesJson.count === "number" ? coursesJson.count : null,
          requestsCount: Array.isArray(connJson) ? connJson.length : null,
          mbtiLabel: mbtiJson.last_test
            ? mbtiJson.can_retest
              ? "C\u00f3 th\u1ec3 l\u00e0m l\u1ea1i"
              : "\u0110\u00e3 l\u00e0m g\u1ea7n \u0111\u00e2y"
            : "Ch\u01b0a l\u00e0m",
          exercisesPreview:
            typeof exJson.count === "number" ? exJson.count : null,
        });
      } catch (err) {
        if (!cancelled) {
          setStats(ERROR_STATS);
          setStatsError(
            err instanceof Error ? err.message : "L\u1ed7i t\u1ea3i d\u1eef li\u1ec7u"
          );
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
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
      title: "Kh\u00f3a h\u1ecdc c\u1ee7a t\u00f4i",
      description:
        stats.coursesCount != null
          ? `${stats.coursesCount} kh\u00f3a \u0111ang m\u1edf (\u0111\u00e3 xu\u1ea5t b\u1ea3n)`
          : "Danh s\u00e1ch kh\u00f3a h\u1ecdc \u0111\u00e3 xu\u1ea5t b\u1ea3n",
      href: "/student/courses",
      cta: "Xem kh\u00f3a h\u1ecdc",
    },
    {
      title: "K\u1ebft n\u1ed1i gi\u00e1o vi\u00ean",
      description:
        stats.requestsCount != null
          ? `${stats.requestsCount} y\u00eau c\u1ea7u \u0111\u00e3 g\u1eedi`
          : "G\u1eedi ho\u1eb7c theo d\u00f5i y\u00eau c\u1ea7u k\u1ebft n\u1ed1i",
      href: "/student/connections",
      cta: "M\u1edf",
    },
    {
      title: "MBTI test",
      description: stats.mbtiLabel,
      href: "/student/mbti",
      cta: "L\u00e0m b\u00e0i",
    },
    {
      title: "Ph\u00f2ng luy\u1ec7n code",
      description:
        stats.exercisesPreview != null
          ? `${stats.exercisesPreview} b\u00e0i trong kho \u2014 random t\u1ea1i ph\u00f2ng luy\u1ec7n ho\u1eb7c ch\u1ecdn \u0111\u1ec1 c\u1ee5 th\u1ec3.`
          : "Luy\u1ec7n t\u1eadp ng\u1eabu nhi\u00ean ho\u1eb7c ch\u1ecdn b\u00e0i theo danh s\u00e1ch.",
      href: "/practice",
      cta: "V\u00e0o ph\u00f2ng luy\u1ec7n",
      extraHref: "/student/practice",
      extraLabel: "Danh s\u00e1ch b\u00e0i",
    },
    {
      title: "Profile",
      description: "Th\u00f4ng tin c\u00e1 nh\u00e2n v\u00e0 c\u00e0i \u0111\u1eb7t",
      href: "/profile",
      cta: "M\u1edf profile",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {`B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n h\u1ecdc sinh`}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {statsLoading
            ? "\u0110ang t\u1ea3i s\u1ed1 li\u1ec7u\u2026"
            : statsError
              ? statsError
              : "Truy c\u1eadp nhanh c\u00e1c khu v\u1ef1c h\u1ecdc t\u1eadp v\u00e0 luy\u1ec7n t\u1eadp."}
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
        {`L\u1ed9 tr\u00ecnh h\u1ecdc t\u1eadp chi ti\u1ebft: `}
        <Link
          href="/dashboard"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {`Dashboard l\u1ed9 tr\u00ecnh`}
        </Link>
      </p>
    </main>
  );
}