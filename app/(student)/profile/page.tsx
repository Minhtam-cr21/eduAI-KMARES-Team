import { BackButton } from "@/components/ui/back-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton fallbackHref="/student" className="self-start" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hồ sơ
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Thông tin tài khoản EduAI.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Session
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-28 shrink-0">Email</dt>
            <dd className="font-medium text-foreground">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-28 shrink-0">User ID</dt>
            <dd className="font-mono text-xs text-foreground break-all">
              {user.id}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Profile
        </h2>
        {profileError ? (
          <p className="text-destructive mt-3 text-sm">
            Không đọc được profile: {profileError.message}
          </p>
        ) : profile ? (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-28">Vai trò</dt>
              <dd className="font-medium text-foreground">{profile.role}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-28">Họ tên</dt>
              <dd>{profile.full_name ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-28">Tạo lúc</dt>
              <dd>
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleString("vi-VN")
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            Chưa có dòng profile.
          </p>
        )}
      </section>

      <p className="text-muted-foreground text-sm">
        <Link href="/dashboard" className="underline underline-offset-4">
          ← Dashboard
        </Link>
      </p>
    </main>
  );
}
