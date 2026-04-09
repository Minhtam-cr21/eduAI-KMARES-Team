"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import Link from "next/link";

type Props = { students: TeacherStudentRow[] };

export function TeacherStudentsTable({ students }: Props) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tiến độ</TableHead>
            <TableHead className="text-right">Chi tiết</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Chưa có học sinh trong danh sách theo dõi.
              </TableCell>
            </TableRow>
          ) : (
            students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{s.email ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-sm">
                  {s.learning_paths_completed} / {s.learning_paths_total} bài
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/teacher/students/${s.id}`}
                    className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Xem
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
