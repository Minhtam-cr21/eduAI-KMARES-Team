"use client";

import { ConnectTeacherDialog } from "@/components/connection/connect-teacher-dialog";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TeacherDiscoveryCard } from "@/lib/types/teacher-discovery";
import { cn } from "@/lib/utils";
import type { ConnectionRequest } from "@/types/database";
import { BookOpen, Search, User, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  accepted:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

function TeacherAvatar({
  name,
  url,
}: {
  name: string | null;
  url: string | null;
}) {
  if (url) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
      <User className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function CourseThumb({
  title,
  thumbnailUrl,
}: {
  title: string;
  thumbnailUrl: string | null;
}) {
  if (thumbnailUrl) {
    return (
      <div className="relative h-9 w-9 overflow-hidden rounded-md border border-border bg-muted">
        <img
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted"
      title={title}
    >
      <BookOpen className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export function TeachersDiscoveryClient() {
  const [tab, setTab] = useState("browse");
  const [teachers, setTeachers] = useState<TeacherDiscoveryCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectTeacher, setConnectTeacher] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  const [myRequests, setMyRequests] = useState<ConnectionRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) q.set("search", search.trim());
      if (category.trim()) q.set("category", category.trim());
      const res = await fetch(`/api/teacher/list?${q.toString()}`);
      const data = (await res.json()) as {
        teachers?: TeacherDiscoveryCard[];
        total?: number;
        categories?: string[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Không tải danh sách giáo viên");
        setTeachers([]);
        return;
      }
      setTeachers(data.teachers ?? []);
      setTotal(data.total ?? 0);
      setCategories(data.categories ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await fetch("/api/connection-requests/student");
      const data = (await res.json()) as ConnectionRequest[] | { error?: string };
      if (!res.ok) {
        toast.error(
          typeof data === "object" && data && "error" in data
            ? String(data.error)
            : "Không tải yêu cầu"
        );
        setMyRequests([]);
        return;
      }
      setMyRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
      setMyRequests([]);
    } finally {
      setReqLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    if (tab === "requests") void loadRequests();
  }, [tab, loadRequests]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function openConnect(t: TeacherDiscoveryCard) {
    setConnectTeacher({ id: t.id, name: t.full_name });
    setConnectOpen(true);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BackButton fallbackHref="/student" className="mb-4" />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Kết nối giáo viên
          </h1>
          <p className="text-sm text-muted-foreground">
            Khám phá giáo viên, xem khóa học và gửi yêu cầu kết nối.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Khám phá giáo viên</TabsTrigger>
          <TabsTrigger value="requests">Yêu cầu của tôi</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[200px] flex-1 space-y-2">
              <label className="text-sm font-medium">Tìm theo tên</label>
              <div className="flex gap-2">
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Tên giáo viên…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      setSearch(searchDraft);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setPage(1);
                    setSearch(searchDraft);
                  }}
                  aria-label="Tìm"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full min-w-[160px] space-y-2 sm:w-48">
              <label className="text-sm font-medium">Lọc theo chuyên môn</label>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Không tìm thấy giáo viên phù hợp.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teachers.map((t) => (
                  <Card
                    key={t.id}
                    className="flex flex-col transition hover:border-primary/25 hover:shadow-md"
                  >
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
                      <TeacherAvatar name={t.full_name} url={t.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-tight">
                          {t.full_name?.trim() || "Giáo viên"}
                        </CardTitle>
                        {t.email_masked ? (
                          <CardDescription className="mt-0.5 text-xs">
                            {t.email_masked}
                          </CardDescription>
                        ) : null}
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t.total_students} học sinh đã từng kết nối
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-1 flex-col gap-3">
                      {t.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.skills.slice(0, 5).map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {t.skills.length > 5 ? (
                            <Badge variant="outline" className="text-xs">
                              +{t.skills.length - 5}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Chưa có khóa học công khai.
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        {t.featured_courses.slice(0, 3).map((c) => (
                          <CourseThumb
                            key={c.id}
                            title={c.title}
                            thumbnailUrl={c.thumbnail_url}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`/student/teachers/${t.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          Xem profile
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => openConnect(t)}
                        >
                          Kết nối
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Trang {page} / {totalPages} · {total} giáo viên
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadRequests()}
            >
              Làm mới
            </Button>
          </div>
          {reqLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : myRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Chưa có yêu cầu nào.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myRequests.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold capitalize",
                          STATUS_STYLE[r.status] ?? ""
                        )}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("vi-VN")
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {r.goal}
                    </p>
                    {r.reason ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Lý do: </span>
                        {r.reason}
                      </p>
                    ) : null}
                    {r.desired_roadmap ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Lộ trình mong muốn:{" "}
                        </span>
                        {r.desired_roadmap}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      GV:{" "}
                      <Link
                        href={`/student/teachers/${r.teacher_id}`}
                        className="text-primary underline"
                      >
                        Xem profile
                      </Link>
                    </p>
                    {r.teacher_response ? (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Phản hồi GV:{" "}
                        </span>
                        {/^https?:\/\//i.test(r.teacher_response.trim()) ? (
                          <a
                            href={r.teacher_response.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-primary underline"
                          >
                            {r.teacher_response.trim()}
                          </a>
                        ) : (
                          <span>{r.teacher_response}</span>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {connectTeacher ? (
        <ConnectTeacherDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          teacherId={connectTeacher.id}
          teacherName={connectTeacher.name}
          onSent={() => void loadRequests()}
        />
      ) : null}
    </main>
  );
}
