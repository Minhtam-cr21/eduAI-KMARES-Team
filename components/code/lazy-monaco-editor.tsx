"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-border bg-muted/40 p-4">
      <Skeleton className="h-[min(360px,70vh)] w-full max-w-full rounded-md" />
    </div>
  ),
});

export function LazyMonacoEditor(props: EditorProps) {
  return <Editor {...props} />;
}
