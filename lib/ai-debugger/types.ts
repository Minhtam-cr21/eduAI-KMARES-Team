export interface AIDebugResponse {
  errorType: "Critical" | "Warning" | "Optimization";
  title: string;
  visualDiff?: { before: string; after: string };
  rootCause: string;
  solution: string;
  impact: string;
  improvements?: string[];
}
