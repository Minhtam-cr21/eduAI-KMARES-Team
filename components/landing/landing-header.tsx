"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type UserInfo = { name: string | null; loggedIn: boolean } | null;

export function LandingHeader() {
  const [user, setUser] = useState<UserInfo>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) {
          if (!cancelled) setUser({ loggedIn: false, name: null });
          return;
        }
        const { profile } = (await res.json()) as {
          profile?: { full_name?: string | null };
        };
        if (!cancelled) {
          setUser({
            loggedIn: true,
            name: profile?.full_name ?? null,
          });
        }
      } catch {
        if (!cancelled) setUser({ loggedIn: false, name: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function scrollTo(id: string) {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const navItems = [
    { label: "Lộ trình", action: () => scrollTo("roadmap") },
    ...(user?.loggedIn
      ? [{ label: "Phòng luyện code", action: () => (window.location.href = "/practice") }]
      : [{ label: "Phòng luyện code", action: () => (window.location.href = "/login") }]),
    { label: "Giáo viên", action: () => scrollTo("teachers") },
    { label: "Liên hệ tư vấn", action: () => scrollTo("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <Image src="/images/logo.png" alt="EduAI" width={32} height={32} className="h-8 w-8 md:h-9 md:w-9" />
          EduAI
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user?.loggedIn ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.name ?? "User"}
              </span>
              <Link
                href="/student"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Đăng nhập
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="text-left text-sm font-medium text-foreground"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {user?.loggedIn ? (
              <Link
                href="/student"
                className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
