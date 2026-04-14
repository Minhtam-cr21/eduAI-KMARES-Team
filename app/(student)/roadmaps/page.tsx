import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function PublicRoadmapsPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("roadmaps")
    .select("id, title, description, image_url, tags, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const list = rows ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap công khai</h1>
        <p className="text-muted-foreground mt-1 text-sm">Public learning paths from teachers — open a card for details.</p>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Chưa có roadmap nào.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li key={r.id as string}>
              <Card className="overflow-hidden border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    <Link
                      href={`/roadmaps/${r.id as string}`}
                      className="hover:text-primary transition-colors"
                    >
                      {r.title as string}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground line-clamp-3">
                    {(r.description as string | null) ?? "—"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {((r.tags as string[] | null) ?? []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={`/roadmaps/${r.id as string}`}
                    className={cn(buttonVariants({ size: "sm" }), "w-fit")}
                  >
                    Xem chi tiết
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
