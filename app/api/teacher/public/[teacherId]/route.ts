import { createClient } from "@/lib/supabase/server";
import { parseTeacherPublicProfile } from "@/lib/teacher/parse-public-profile";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { teacherId: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const idParse = z.string().uuid().safeParse(params.teacherId);
  if (!idParse.success) {
    return NextResponse.json({ error: "Invalid teacher id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_teacher_public_profile", {
    p_teacher_id: idParse.data,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profile = parseTeacherPublicProfile(data);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
