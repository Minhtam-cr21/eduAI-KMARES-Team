import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CareerOrientationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/career");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("assessment_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.assessment_completed === true) {
    redirect("/assessment/result");
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Định hướng nghề nghiệp</CardTitle>
          <CardDescription>
            Hoàn thành trắc nghiệm định hướng để xem phân tích MBTI, trụ cột và
            gợi ý nghề — kết quả hiển thị trên trang kết quả chung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/assessment"
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex"
            )}
          >
            Làm bài test ngay
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
