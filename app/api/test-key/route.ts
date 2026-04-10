import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Kiểm tra nhanh (chỉ server): x_rapidapi_key (env) đã được nạp và không rỗng. Không trả về giá trị key. */
export async function GET() {
  const key = process.env["x_rapidapi_key"]?.trim();
  if (key) {
    return NextResponse.json(
      { ok: true, message: "x_rapidapi_key is set" },
      { status: 200 }
    );
  }
  return NextResponse.json(
    {
      ok: false,
      message:
        "x_rapidapi_key missing or empty — check .env.local at project root and restart npm run dev",
    },
    { status: 503 }
  );
}
