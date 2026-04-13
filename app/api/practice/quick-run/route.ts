import { executeCode, type RunCodeLanguage } from "@/lib/code-runner";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string(),
  language: z.enum(["python", "javascript", "cpp", "java"]),
  stdin: z.string().optional().default(""),
});

/**
 * Chạy code tự do (phòng luyện random), không bắt buộc exercise_id.
 * Thay thế /api/run-code sau khi gỡ debugger cũ.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, language, stdin } = parsed.data;

  try {
    const result = await executeCode({
      code,
      language: language as RunCodeLanguage,
      stdin,
    });

    const { error: insertErr } = await supabase.from("code_submissions").insert({
      user_id: user.id,
      code,
      language,
      output: result.output || null,
      error: result.error || null,
    });

    if (insertErr) {
      console.error("[practice/quick-run] insert code_submissions:", insertErr.message);
    }

    return NextResponse.json({
      output: result.output ?? "",
      error: result.error ?? "",
      exit_code: result.exit_code,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        output: "",
        error: `Lỗi chạy code: ${msg}`,
        exit_code: -1,
      },
      { status: 200 }
    );
  }
}
