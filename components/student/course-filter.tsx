"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export type CourseCategoryChip = {
  id: string;
  name: string;
  slug: string;
};

export type CourseFilterBarProps = {
  categories: CourseCategoryChip[];
  categoriesLoading?: boolean;
  categorySlug: string;
  onCategoryChange: (slug: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
};

export function CourseFilterBar({
  categories,
  categoriesLoading,
  categorySlug,
  onCategoryChange,
  search,
  onSearchChange,
  searchPlaceholder = "Tìm theo tên hoặc mô tả...",
}: CourseFilterBarProps) {
  const chips: CourseCategoryChip[] = [
    { id: "all", name: "Tất cả khóa học", slug: "all" },
    ...categories.filter((c) => c.slug !== "all"),
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {categoriesLoading ? (
          <Skeleton className="h-9 w-40 shrink-0 rounded-full" />
        ) : (
          chips.map((cat) => {
            const active = categorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.slug)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
