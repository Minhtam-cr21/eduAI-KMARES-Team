import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default async function PublicRoadmapDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("roadmaps")
    .select("id, title, description, content, image_url, tags, created_at, is_public")
    .eq("id", params.id)
    .maybeSingle();

  if (!row || !row.is_public) {
    notFound();
  }

  const content = (row.content as string | null) ?? "";
  const looksLikeMarkdown = /[#*`_\[]/.test(content) || content.includes("\n");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/roadmaps" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto p-0")}>
        ← Danh sách
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{row.title as string}</h1>
        {row.description ? (
          <p className="text-muted-foreground text-sm">{row.description as string}</p>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {((row.tags as string[] | null) ?? []).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      {row.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.image_url as string}
          alt=""
          className="aspect-video w-full rounded-xl border border-border/60 object-cover"
        />
      ) : null}

      <section className="prose prose-sm dark:prose-invert max-w-none">
        {content ? (
          looksLikeMarkdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs">{content}</pre>
          )
        ) : (
          <p className="text-muted-foreground text-sm">Chưa có nội dung.</p>
        )}
      </section>
    </div>
  );
}
