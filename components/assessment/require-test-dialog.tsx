"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

type RequireTestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RequireTestDialog({
  open,
  onOpenChange,
}: RequireTestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cần hoàn thành trắc nghiệm định hướng</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            Bạn cần hoàn thành bài test &quot;Trắc nghiệm định hướng&quot; (50 câu)
            để truy cập tính năng này. Bài test giúp chúng tôi đề xuất lộ trình và
            định hướng nghề nghiệp phù hợp với bạn.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Để sau
          </Button>
          <Link
            href="/assessment"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            onClick={() => onOpenChange(false)}
          >
            Làm bài test ngay
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
