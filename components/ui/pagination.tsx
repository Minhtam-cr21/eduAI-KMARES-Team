"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  className?: string;
};

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn("flex items-center justify-center gap-2 pt-6", className)}
      aria-label="Phân trang"
    >
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-muted-foreground min-w-[120px] text-center text-sm tabular-nums">
        Trang {page} / {totalPages}
      </span>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
