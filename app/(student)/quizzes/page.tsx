import { buttonVariants } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Placeholder until quizzes are loaded from the database. */
export default function StudentQuizzesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Quizzes</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Course and lesson quizzes will be listed here once the quiz module is wired to the
          database.
        </p>
        <Link
          href="/student"
          className={buttonVariants({ variant: "outline", className: "mt-6 inline-flex" })}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
