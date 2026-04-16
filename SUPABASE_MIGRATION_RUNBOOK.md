# Supabase Migration Runbook

**Date:** 2026-04-16  
**Scope:** Apply the repo migrations required by local Phase 3 and Phase 5 code to the real Supabase database, then verify the remote schema is aligned.

## 1. Required migrations

Remote Supabase is currently missing these repo changes:

1. `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`
   - adds to `public.career_orientations`:
     - `learner_profile jsonb`
     - `ai_analysis jsonb`
     - `analysis_source text`
     - `assessment_version text`
2. `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`
   - creates `public.teacher_review_events`
   - enables RLS
   - adds indexes and policies

## 2. Apply order

Apply in this order:

1. Verify baseline personalization tables already exist from:
   - `supabase/migrations/20250413_add_personalization_tables.sql`
2. Apply Phase 3 migration:
   - `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`
3. Apply Phase 5 migration:
   - `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`

Reason for order:
- Phase 3 columns are already read by assessment and personalized path surfaces
- Phase 5 review workflow depends on its own table only, but should be applied after the assessment schema is aligned to reduce partial-sync confusion

## 3. Manual apply in Supabase SQL Editor

Because Supabase CLI is not available in the current local environment, use Supabase Dashboard SQL Editor.

### Step-by-step

1. Open the target project in Supabase Dashboard.
2. Open `SQL Editor`.
3. Create a new query tab.
4. Paste the full contents of:
   - `supabase/migrations/20260416000000_phase3_assessment_analysis_columns.sql`
5. Run the SQL.
6. Confirm success in the SQL output pane.
7. Repeat with:
   - `supabase/migrations/20260416010000_phase5_teacher_review_events.sql`

### Important

- Do not partially copy the migration.
- Run each migration as a full unit.
- If your team uses a migration tracking convention outside SQL Editor, record the exact time and operator who applied it.

## 4. Verification queries after apply

Run these queries in SQL Editor after the migrations finish.

### 4.1 Verify Phase 3 columns

```sql
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'career_orientations'
  and column_name in (
    'learner_profile',
    'ai_analysis',
    'analysis_source',
    'assessment_version'
  )
order by column_name;
```

Expected:
- 4 rows returned

### 4.2 Verify Phase 5 table

```sql
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'teacher_review_events';
```

Expected:
- 1 row returned

### 4.3 Verify Phase 5 columns

```sql
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'teacher_review_events'
order by ordinal_position;
```

Expected key columns:
- `teacher_id`
- `student_id`
- `path_id`
- `review_kind`
- `review_status`
- `risk_level`
- `source`
- `action_recommendation`
- `review_note`
- `adjustment_note`
- `snapshot`
- `created_at`

### 4.4 Verify RLS is enabled

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'teacher_review_events';
```

Expected:
- `rowsecurity = true`

### 4.5 Verify policies exist

```sql
select
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'teacher_review_events'
order by policyname;
```

Expected policies:
- teacher select
- teacher insert
- admin full access

## 5. Runtime surfaces affected by missing migrations

### If Phase 3 migration is missing

Likely failures:
- `POST /api/assessment/submit`
- `GET /api/assessment/result`
- `GET /api/assessment/status`
- `GET/POST /api/personalized-path/suggest`

### If Phase 5 migration is missing

Likely failures:
- `GET /api/personalized-path/teacher`
- `GET /api/personalized-path/teacher/by-student/[studentId]`
- `PUT /api/personalized-path/teacher/[pathId]/approve`
- `GET /api/teacher/students/[id]/schedule`
- `POST /api/teacher/students/[id]/schedule`

## 6. Verify in app after SQL apply

After DB verification queries pass:

1. Open assessment flow and submit a test response.
2. Load assessment result page.
3. Open teacher personalized path editor for a student with assessment data.
4. Open teacher schedule insights and save a review note.
5. Confirm no route returns `schema_not_synced`.

## 7. Rollback / risk checklist

This phase does not define a destructive rollback.

If something fails:

1. Stop applying later migrations until the current one is understood.
2. Capture:
   - exact SQL error
   - timestamp
   - project/environment
3. Verify whether partial objects were created:
   - columns on `career_orientations`
   - table/policies/indexes on `teacher_review_events`
4. Do not improvise destructive cleanup in production.
5. If cleanup is required, prepare a separate reviewed SQL script.

## 8. Risk notes

- Local `npm run build` passing does not mean remote Supabase is ready.
- Runtime guards added in Phase 6A are temporary diagnostics only.
- Guards do **not** replace applying migrations.
- Production/remote verification must be recorded by the team after SQL Editor apply.
