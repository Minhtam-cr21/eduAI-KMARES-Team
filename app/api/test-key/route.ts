import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Kiểm tra nhanh (chỉ server): x-rapidapi-key (env) đã được nạp và không rỗng. Không trả về giá trị key. */
export async function GET() {
  const key = process.env["x-rapidapi-key"]?.trim();
  if (key) {
    return NextResponse.json(
      { ok: true, message: "x-rapidapi-key is set" },
      { status: 200 }
    );
  }
  return NextResponse.json(
    {
      ok: false,
      message:
        "x-rapidapi-key missing or empty — check .env.local at project root and restart npm run dev",
    },
    { status: 503 }
  );
}
