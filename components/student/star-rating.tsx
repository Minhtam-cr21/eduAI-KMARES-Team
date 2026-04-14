"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export type StarRatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  showValue?: boolean;
  reviewCount?: number | null;
};

export function StarRating({
  value,
  max = 5,
  size = "sm",
  className,
  showValue = true,
  reviewCount,
}: StarRatingProps) {
  const r = Math.min(max, Math.max(0, Number(value) || 0));
  const filled = Math.round(r);
  const starClass =
    size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label={`Đánh giá ${r.toFixed(1)} / ${max}`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              starClass,
              i < filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
            )}
          />
        ))}
      </div>
      {showValue ? (
        <span className="tabular-nums text-xs font-medium text-foreground">
          {r.toFixed(1)}
        </span>
      ) : null}
      {reviewCount != null && reviewCount > 0 ? (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      ) : null}
    </div>
  );
}
