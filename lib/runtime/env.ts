export class RuntimeEnvError extends Error {
  readonly code = "runtime_env_missing";

  constructor(
    public readonly missingEnv: string[],
    message?: string
  ) {
    super(
      message ??
        `Thiếu biến môi trường bắt buộc: ${missingEnv.join(", ")}.`
    );
    this.name = "RuntimeEnvError";
  }
}

export function isRuntimeEnvError(error: unknown): error is RuntimeEnvError {
  return error instanceof RuntimeEnvError;
}

function readFirstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  const url = readFirstEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  ]);
  const anonKey = readFirstEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  const missingEnv = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
  ].filter((item): item is string => Boolean(item));

  if (missingEnv.length > 0) {
    throw new RuntimeEnvError(
      missingEnv,
      "Thiếu cấu hình Supabase cho runtime hiện tại. " +
        `Trên Vercel hãy set ${missingEnv.join(" và ")} ` +
        "(hoặc tương đương SUPABASE_URL và SUPABASE_ANON_KEY — next.config map sang NEXT_PUBLIC khi build). " +
        "Sau đó Redeploy without cache."
    );
  }

  return {
    url: url as string,
    anonKey: anonKey as string,
  };
}
