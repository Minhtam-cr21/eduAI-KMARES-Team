"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

type PathListRow = {
  id: string;
  student_id: string;
  status: string;
  updated_at: string | null;
  student_name: string | null;
};

const LABEL: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ",
  pending_student_approval: "Chờ học sinh",
  revision_requested: "Học sinh góp ý",
  active: "Đang học",
  paused: "Tạm dừng",
};

export function PersonalizedPathsListClient() {
  const [paths, setPaths] = useState<PathListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/personalized-path/teacher");
        const j = (await res.json()) as {
          paths?: PathListRow[];
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(j.error ?? "Lỗi tải danh sách");
          return;
        }
        if (!cancelled) setPaths(j.paths ?? []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Lỗi mạng");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!paths) {
    return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học sinh</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Cập nhật</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paths.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Chưa có lộ trình nào.
              </TableCell>
            </TableRow>
          ) : (
            paths.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.student_name ?? p.student_id}
                </TableCell>
                <TableCell>
                  {LABEL[p.status] ?? p.status}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {p.updated_at
                    ? new Date(p.updated_at).toLocaleString("vi-VN")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/teacher/personalized-paths/${p.student_id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex"
                    )}
                  >
                    Chi tiết
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
