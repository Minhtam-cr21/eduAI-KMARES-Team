import { callOpenai } from "./providers/openai";
import { ruleBasedAnalysis } from "./rule-based";
import type { AIDebugResponse } from "./types";

export type { AIDebugResponse } from "./types";
export type AiProviderName = "openai" | "rule";

const PROVIDER_TIMEOUT_MS = 10_000;
const DEFAULT_ORDER: AiProviderName[] = ["openai", "rule"];

function parseProviderOrder(): AiProviderName[] {
  const raw = process.env.AI_PROVIDER_ORDER?.trim();
  if (!raw) return [...DEFAULT_ORDER];
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AiProviderName => s === "openai" || s === "rule");
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
    extra = `\n\nFile li\u00ean quan:\n${files
      .map(
        (f) =>
          `--- ${f.path} ---\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? "\n\u2026" : ""}`
      )
      .join("\n\n")}`;
  }
  return `Ng\u00f4n ng\u1eef: ${language}

Code:
${code}

L\u1ed7i / stderr:
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
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Fallback theo `AI_PROVIDER_ORDER` (m\u1eb7c \u0111\u1ecbnh: openai \u2192 rule).
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
      : "_Kh\u00f4ng c\u00f3 diff minh h\u1ecda._";

  const improvementsBlock =
    r.improvements?.length && r.improvements.length > 0
      ? r.improvements.map((x) => `- ${x}`).join("\n")
      : "_Kh\u00f4ng c\u00f3._";

  return `## \u{1F534} ${r.errorType} \u2013 ${r.title}

### \u{1F4CC} Visual Diff
${diffBlock}

### \u{1F50D} Root Cause Analysis
${r.rootCause}

### \u{1F6E0}\uFE0F C\u00e1ch s\u1eeda
${r.solution}

### \u26A0\uFE0F H\u1eadu qu\u1ea3 d\u00e0i h\u1ea1n
${r.impact}

### \u{1F4C8} C\u1ea3i thi\u1ec7n hi\u1ec7u n\u0103ng / B\u1ea3o m\u1eadt (n\u1ebfu c\u00f3)
${improvementsBlock}
`;
}
