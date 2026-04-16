import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GitBranch, Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Hub for path review: personalized sequences vs AI-submitted roadmaps awaiting approval. */
export default function TeacherPathReviewHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Duyệt lộ trình
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Workspace này dùng để duyệt path theo từng học sinh. Hàng đợi path và AI
          proposal vẫn giữ compatibility route cũ, nhưng intervention workflow chính
          nên quay về student workspace khi cần quyết định.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-lg">Personalized paths</CardTitle>
            </div>
            <CardDescription>
              Danh sách path theo học sinh: chỉnh course order, gửi cho học sinh, theo
              dõi active hoặc paused.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/teacher/personalized-paths"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Open personalized paths
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg">AI roadmaps (pending)</CardTitle>
            </div>
            <CardDescription>
              Proposal AI do học sinh gửi. Duyệt hoặc từ chối, sau đó quay lại workspace
              từng học sinh để review assessment + schedule nếu cần.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/teacher/ai-roadmaps"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Open AI queue
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
