"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  label?: string;
};

export function GoogleSignInButton({ label = "Đăng nhập bằng Google" }: Props) {
  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      console.error("[auth:google]", error.message);
      alert(`Đăng nhập Google thất bại: ${error.message}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50"
    >
      <span aria-hidden>🔐</span>
      {label}
    </button>
  );
}
