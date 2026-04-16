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

function readRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  const url = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const missingEnv = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
  ].filter((item): item is string => Boolean(item));

  if (missingEnv.length > 0) {
    throw new RuntimeEnvError(
      missingEnv,
      "Thiếu cấu hình Supabase cho runtime hiện tại. " +
        `Cần set: ${missingEnv.join(", ")}.`
    );
  }

  return {
    url: url as string,
    anonKey: anonKey as string,
  };
}
