"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeacherDashboardStats } from "@/lib/teacher/dashboard-stats";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, GitBranch, Link2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TeacherDashboardStatsPremium({
  stats,
}: {
  stats: TeacherDashboardStats;
}) {
  const chartData = stats.weekly_new_students.map((w) => ({
    name: w.label,
    hs: w.count,
  }));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0 }}
        >
          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardDescription>Khóa học</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stats.total_courses}
                </CardTitle>
              </div>
              <div className="rounded-xl bg-violet-500/15 p-2 text-violet-600 dark:text-violet-400">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">
                {stats.courses_published} đã duyệt
              </span>
              {" · "}
              <span className="text-amber-600 dark:text-amber-400">
                {stats.courses_pending} chờ duyệt
              </span>
              <Link
                href="/teacher/courses"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "mt-2 block h-auto p-0 text-xs"
                )}
              >
                Quản lý khóa học →
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardDescription>Học sinh theo dõi</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stats.total_students}
                </CardTitle>
              </div>
              <div className="rounded-xl bg-sky-500/15 p-2 text-sky-600 dark:text-sky-400">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href="/teacher/students"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0 text-xs"
                )}
              >
                Danh sách học sinh →
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardDescription>Kết nối chờ xử lý</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stats.pending_connections}
                </CardTitle>
              </div>
              <div className="rounded-xl bg-amber-500/15 p-2 text-amber-700 dark:text-amber-400">
                <Link2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href="/teacher/connections"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0 text-xs"
                )}
              >
                Xem yêu cầu →
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardDescription>Lộ trình AI chờ duyệt</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">
                  {stats.pending_ai_roadmaps}
                </CardTitle>
              </div>
              <div className="rounded-xl bg-fuchsia-500/15 p-2 text-fuchsia-600 dark:text-fuchsia-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href="/teacher/ai-roadmaps"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0 text-xs"
                )}
              >
                Duyệt lộ trình AI →
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" />
              Học sinh kết nối mới theo tuần
            </CardTitle>
            <CardDescription>
              Số lượt chấp nhận kết nối theo tuần (8 tuần gần nhất)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="hs"
                    name="Kết nối"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
