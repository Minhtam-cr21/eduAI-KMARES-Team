"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeacherStudentRow } from "@/lib/types/teacher";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

type Props = { students: TeacherStudentRow[] };

export function TeacherStudentsTable({ students }: Props) {
  if (students.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có học sinh trong danh sách theo dõi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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
          {students.map((s) => {
            const total = s.learning_paths_total ?? 0;
            const completed = s.learning_paths_completed ?? 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">
                  {s.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.email ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-2 w-20" />
                    <Badge variant="secondary" className="text-[10px] tabular-nums">
                      {completed}/{total}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/teacher/students/${s.id}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Mở workspace
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
