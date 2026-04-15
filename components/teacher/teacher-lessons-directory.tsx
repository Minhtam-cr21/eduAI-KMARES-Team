"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

type Row = {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  order_index: number | null;
  status: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  published:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

export function TeacherLessonsDirectory({ lessons }: { lessons: Row[] }) {
  if (lessons.length === 0) {
    return (
      <Card className="border-dashed border-border/80 py-14 text-center text-sm text-muted-foreground">
        Chưa có bài học trên khóa nào.
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-sm"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Khóa học</TableHead>
            <TableHead>Tiêu đề bài</TableHead>
            <TableHead className="text-right">Thứ tự</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="max-w-[180px] truncate font-medium">
                {l.course_title}
              </TableCell>
              <TableCell>{l.title}</TableCell>
              <TableCell className="text-right tabular-nums">
                {l.order_index ?? 0}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold capitalize",
                    STATUS_BADGE[l.status ?? ""] ?? ""
                  )}
                >
                  {l.status ?? "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/teacher/courses/${l.course_id}/curriculum`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Mở khóa
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
