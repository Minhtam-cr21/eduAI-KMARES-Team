"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) {
          if (!cancelled) setFallback(true);
          return;
        }
        const { profile } = (await res.json()) as {
          profile?: { role?: string };
        };
        if (cancelled) return;

        if (profile?.role === "teacher") {
          router.replace("/teacher");
        } else if (profile?.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/student");
        }
      } catch {
        if (!cancelled) setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (fallback) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          Không xác định được vai trò. Hãy{" "}
          <a href="/login" className="underline">
            đăng nhập lại
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-center">
      <p className="text-muted-foreground text-sm">Đang chuyển hướng…</p>
    </main>
  );
}
