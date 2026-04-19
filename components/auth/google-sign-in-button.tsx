"use client";

import { getBrowserSiteOrigin } from "@/lib/site-origin";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  label?: string;
};

export function GoogleSignInButton({ label = "Đăng nhập bằng Google" }: Props) {
  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    const origin = getBrowserSiteOrigin();
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
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground shadow-sm transition hover:bg-secondary/80"
    >
      <span aria-hidden>🔐</span>
      {label}
    </button>
  );
}
