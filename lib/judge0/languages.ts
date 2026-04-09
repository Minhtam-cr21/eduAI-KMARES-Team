/** UI language → Judge0 CE `language_id` (RapidAPI judge0-ce.p.rapidapi.com) */
export type UiLanguage = "python" | "javascript" | "cpp" | "java";

const LANGUAGE_ID: Record<UiLanguage, number> = {
  /** Python 3.9.6 */
  python: 71,
  /** JavaScript (Node.js 14.17.6) */
  javascript: 63,
  /** C++ (GCC 9.2.0) */
  cpp: 54,
  /** Java (OpenJDK 13.0.1) */
  java: 62,
};

export function mapLanguageToJudge0Id(lang: UiLanguage): number {
  return LANGUAGE_ID[lang];
}

export const JUDGE0_SUBMISSIONS_URL =
  "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true";
