import { NextResponse } from "next/server";

export type SchemaDependency = {
  phase: string;
  migrationFile: string;
  feature: string;
  relation: string;
  columns?: string[];
};

type SupabaseLikeError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

export class SchemaSyncError extends Error {
  readonly status = 503;
  readonly code = "schema_not_synced";
  readonly phase: string;
  readonly migrationFile: string;
  readonly feature: string;
  readonly relation: string;
  readonly columns: string[];
  readonly raw?: string;

  constructor(args: {
    dependency: SchemaDependency;
    raw?: string;
  }) {
    const { dependency, raw } = args;
    const scopedColumns =
      dependency.columns && dependency.columns.length > 0
        ? ` (${dependency.columns.join(", ")})`
        : "";
    super(
      `Remote Supabase schema appears out of sync for ${dependency.feature}. Missing required ${dependency.phase} migration: ${dependency.migrationFile}. Check relation ${dependency.relation}${scopedColumns} and apply the migration before using this surface.`
    );
    this.phase = dependency.phase;
    this.migrationFile = dependency.migrationFile;
    this.feature = dependency.feature;
    this.relation = dependency.relation;
    this.columns = dependency.columns ?? [];
    this.raw = raw;
  }
}

function normalizeError(error: unknown): SupabaseLikeError {
  if (error && typeof error === "object") {
    return error as SupabaseLikeError;
  }
  return { message: typeof error === "string" ? error : String(error ?? "") };
}

function containsIdentifier(raw: string, dependency: SchemaDependency): boolean {
  const identifiers = [dependency.relation, ...(dependency.columns ?? [])]
    .map((value) => value.toLowerCase())
    .filter(Boolean);
  return identifiers.some((identifier) => raw.includes(identifier));
}

export function createSchemaSyncError(
  error: unknown,
  dependency: SchemaDependency
): SchemaSyncError | null {
  const normalized = normalizeError(error);
  const raw = [
    normalized.message,
    normalized.details,
    normalized.hint,
    normalized.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!raw) return null;

  const code = normalized.code?.toUpperCase() ?? "";
  const hasKnownCode = [
    "42703", // undefined_column
    "42P01", // undefined_table
    "PGRST204",
    "PGRST205",
  ].includes(code);

  const hasKnownPattern =
    raw.includes("does not exist") ||
    raw.includes("schema cache") ||
    raw.includes("could not find the") ||
    raw.includes("undefined column") ||
    raw.includes("undefined table");

  if ((hasKnownCode || hasKnownPattern) && containsIdentifier(raw, dependency)) {
    return new SchemaSyncError({
      dependency,
      raw: [normalized.message, normalized.details, normalized.hint]
        .filter(Boolean)
        .join(" | "),
    });
  }

  return null;
}

export function schemaSyncErrorResponse(error: SchemaSyncError) {
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      phase: error.phase,
      migration: error.migrationFile,
      relation: error.relation,
      columns: error.columns,
      details: error.raw ?? null,
    },
    { status: error.status }
  );
}
