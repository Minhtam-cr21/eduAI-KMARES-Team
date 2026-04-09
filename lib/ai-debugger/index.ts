import { callDeepseek } from "./providers/deepseek";
import { callOpenai } from "./providers/openai";
import { ruleBasedAnalysis } from "./rule-based";
import type { AIDebugResponse } from "./types";

export type { AIDebugResponse } from "./types";
export type AiProviderName = "deepseek" | "openai" | "rule";

const PROVIDER_TIMEOUT_MS = 10_000;
const DEFAULT_ORDER: AiProviderName[] = ["deepseek", "openai", "rule"];

function parseProviderOrder(): AiProviderName[] {
  const raw = process.env.AI_PROVIDER_ORDER?.trim();
  if (!raw) return [...DEFAULT_ORDER];
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AiProviderName =>
      s === "deepseek" || s === "openai" || s === "rule"
    );
  return parts.length > 0 ? parts : [...DEFAULT_ORDER];
}

function buildUserPrompt(
  code: string,
  error: string,
  language: string,
  context?: { projectFiles?: { path: string; content: string }[] }
): string {
  let extra = "";
  const files = context?.projectFiles;
  if (files?.length) {
    extra = `\n\nFile liên quan:\n${files
      .map(
        (f) =>
          `--- ${f.path} ---\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? "\n…" : ""}`
      )
      .join("\n\n")}`;
  }
  return `Ngôn ngữ: ${language}

Code:
${code}

Lỗi / stderr:
${error}
${extra}`;
}

function withTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return factory(controller.signal).finally(() => clearTimeout(timer));
}

export function isAiDebuggerConfigured(): boolean {
  return Boolean(
    process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
}

/**
 * Fallback 3 cấp theo `AI_PROVIDER_ORDER` (mặc định: deepseek → openai → rule).
 */
export async function analyzeCodeError(
  code: string,
  error: string,
  language: string,
  context?: { projectFiles?: { path: string; content: string }[] }
): Promise<AIDebugResponse> {
  const userPrompt = buildUserPrompt(code, error, language, context);
  const order = parseProviderOrder();

  for (const step of order) {
    if (step === "rule") {
      return ruleBasedAnalysis(code, error, language);
    }

    try {
      if (step === "deepseek") {
        if (!process.env.DEEPSEEK_API_KEY?.trim()) {
          console.error("[ai-debugger] skip deepseek: DEEPSEEK_API_KEY empty");
          continue;
        }
        return await withTimeout(
          (sig) => callDeepseek(userPrompt, sig),
          PROVIDER_TIMEOUT_MS
        );
      }

      if (step === "openai") {
        if (!process.env.OPENAI_API_KEY?.trim()) {
          console.error("[ai-debugger] skip openai: OPENAI_API_KEY empty");
          continue;
        }
        return await withTimeout(
          (sig) => callOpenai(userPrompt, sig),
          PROVIDER_TIMEOUT_MS
        );
      }
    } catch (e) {
      console.error(`[ai-debugger] provider "${step}" failed:`, e);
    }
  }

  return ruleBasedAnalysis(code, error, language);
}

function visualDiffToMarkdown(before: string, after: string): string {
  const minus = before
    .split("\n")
    .map((l) => `- ${l}`)
    .join("\n");
  const plus = after
    .split("\n")
    .map((l) => `+ ${l}`)
    .join("\n");
  return `\`\`\`diff\n${minus}\n${plus}\n\`\`\``;
}

export function formatAiDebugMarkdown(r: AIDebugResponse): string {
  const diffBlock =
    r.visualDiff !== undefined
      ? visualDiffToMarkdown(r.visualDiff.before, r.visualDiff.after)
      : "_Không có diff minh họa._";

  const improvementsBlock =
    r.improvements?.length && r.improvements.length > 0
      ? r.improvements.map((x) => `- ${x}`).join("\n")
      : "_Không có._";

  return `## 🔴 ${r.errorType} – ${r.title}

### 📌 Visual Diff
${diffBlock}

### 🔍 Root Cause Analysis
${r.rootCause}

### 🛠️ Cách sửa
${r.solution}

### ⚠️ Hậu quả dài hạn
${r.impact}

### 📈 Cải thiện hiệu năng / Bảo mật (nếu có)
${improvementsBlock}
`;
}
