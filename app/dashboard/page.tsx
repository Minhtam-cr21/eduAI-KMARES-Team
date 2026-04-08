import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          ← Trang chủ
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
          Chào mừng bạn đến với EduAI
        </h1>
        <p className="mt-2 text-neutral-600">
          Bạn đã đăng nhập. Đây là trang dashboard tạm thời.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Session
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-neutral-500">Email</dt>
            <dd className="font-medium text-neutral-900">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-neutral-500">User ID</dt>
            <dd className="break-all font-mono text-xs text-neutral-800">
              {user.id}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Profile (bảng <code className="text-neutral-700">profiles</code>)
        </h2>
        {profileError ? (
          <p className="mt-3 text-sm text-red-600">
            Không đọc được profile: {profileError.message}
          </p>
        ) : profile ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-emerald-700">
              Đã có bản ghi profile (trigger hoạt động). Role mặc định:{" "}
              <strong>{profile.role}</strong>
              {profile.role === "student" ? " ✓" : ""}
            </p>
            <dl className="space-y-1">
              <div className="flex gap-2">
                <dt className="w-28 text-neutral-500">Họ tên</dt>
                <dd>{profile.full_name ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-neutral-500">Tạo lúc</dt>
                <dd>
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleString("vi-VN")
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-3 text-amber-700">
            Chưa thấy dòng trong <code>profiles</code> — kiểm tra trigger{" "}
            <code>on_auth_user_created</code> trên Supabase.
          </p>
        )}
      </section>
    </main>
  );
}
