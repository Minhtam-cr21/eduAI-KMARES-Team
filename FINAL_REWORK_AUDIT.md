# Final rework audit — EduAI

**Date:** 2026-04-16  
**Scope:** Full repo application surface (Next.js App Router + Supabase). Does **not** deep-review `openai-test/`. **No new features** were added in this audit pass.

**Method:** Reviewed `middleware.ts`, `app/**` routes, `components/student` and `components/teacher`, `app/api/**`, `supabase/migrations/*.sql`, static import grep for dead components, architecture docs, and ran a real `npm run build` on the current working tree on **2026-04-16**. Production/remote DB state was **not** verified in the original audit pass; Phase 6A treated remote sync as blocker, and current team context for Phase 6B says the required Phase 3/5 schema is now present remotely.

---

## 1. Project layout (summary)

| Area | Main paths |
|------|------------|
| Auth | `app/(auth)/login`, `signup`, `app/auth/callback` |
| Student | `app/(student)/**` |
| Teacher | `app/(dashboard)/teacher/**` |
| Admin | **`app/admin/**`** (topics, lessons, …) and **`app/(dashboard)/admin/**` — two UI trees |
| API | `app/api/**` |
| Database | `supabase/migrations/` (42 SQL files: 001…040, dated 20250409*, 20250413*) |
| Target docs | `DATA_TARGET_SCHEMA.md`, `MIGRATION_MAP.md`, `MIGRATION_STRATEGY.md`, `PROJECT_AUDIT.md` |

---

## 2. Findings by category

### 2.1 Routes

- About **48** `page.tsx` files under `app/`.
- Production build was **verified** on the current working tree (`npm run build`, 2026-04-16) and compiled teacher routes including `/teacher/connections`, `/teacher/courses/[courseId]/edit-v2`, `/teacher/path-review`, and `/teacher/schedule-insights`.
- **Student hub:** `/student`; pillars: `/student/courses`, `/personalized-roadmap`, `/study-schedule`, `/profile`. **Legacy** routes remain (`/quizzes`, `/assessment`, `/career`, `/student/connections`, `/roadmaps`, …).
- **Teacher:** Primary sidebar + “Thêm” group; new hubs `/teacher/path-review`, `/teacher/schedule-insights`.
- **Admin:** Duplicate entry points (see risks).

### 2.2 Role access

- **`middleware.ts`:** `admin` for `/admin` and `/api/admin/*`. `teacher` or `admin` for `/teacher/*` and `/api/teacher/*`, **except** `/api/teacher/list` and `/api/teacher/public/*` (any logged-in user). `/api/notifications*` is also gated as teacher/admin; only `app/api/notifications/teacher/route.ts` exists — consistent.
- **Session-only protected paths** (no fine-grained role in middleware): `/student`, `/study-schedule`, `/profile`, `/learn`, `/dashboard`, etc. Most `/api/*` relies on handlers + RLS unless matched above.
- **`/api/personalized-path/*`** is **not** role-gated in middleware; handlers use `getTeacherOrAdminSupabase` / student auth as appropriate.

### 2.3 API consistency

- **Schedule:** Students use `/api/study-schedule` (+ `by-lesson`, `complete`). Deprecated duplicate: `/api/user/study-schedule/by-lesson` (documented).
- **Teacher schedule read:** `GET /api/teacher/students/[id]/schedule` mirrors enrichment pattern of `/api/study-schedule` for lesson/course titles.
- **Teacher progress:** `GET /api/teacher/students/[id]/progress` uses **`learning_paths`** — consistent internally but **parallel** to `user_courses` / v2 progress model (schema not unified).
- **Student course runtime has no single SOT yet:** `/student/courses` and `/api/user/courses/enrolled` still aggregate `user_courses` + `courses` + `course_lessons` + `user_course_progress`, while explore / detail / learn can branch into `/api/v2/*` and `edu_*`.
- **`learning_paths` remains a separate progress semantic:** it is active for roadmap-oriented teacher/student flows, but it is not the same source of truth as `user_course_progress` or `edu_student_progress`.
- **Assessment pipeline is now structured but additive:** `/api/assessment/submit` keeps legacy writes (`assessment_responses`, `career_orientations`, `profiles.assessment_completed`) and also stores `learner_profile`, `ai_analysis`, `analysis_source`, `assessment_version` on `career_orientations`. OpenAI is server-side only and falls back to rule-based output if unavailable.
- **Personalized path input is now structured-first:** `/api/personalized-path/suggest` reads `career_orientations.learner_profile` / `ai_analysis` first, then falls back to `assessment_responses` only if structured assessment data is missing or invalid.
- **Schedule analysis is now additive and deterministic:** student and teacher schedule read routes keep existing `items` payloads and add shared `summary` / `analysis` snapshots from `study_schedule`, with estimated hours left `null` when current data is insufficient.
- **Teacher review workflow now has minimal persistence:** path and schedule teacher surfaces can append compact review records (`teacher_review_events`) with note/status/risk metadata, while `personalized_paths` and `study_schedule` remain the domain SOTs.

### 2.4 Schema consistency

- No new migrations were required for recent **UI-only** reworks; **no “missing migration file”** was found for merged code in repo (remote DB not checked).
- **`teacher_insight_events`** appears in `DATA_TARGET_SCHEMA.md` as optional — **no migration** in repo → documented target only.
- **Phase 5 teacher review events:** additive migration now exists for persisted teacher path/schedule reviews.
- **Remote DB blocker note changed after Phase 6A:** the repo previously needed explicit DB sync verification for Phase 3/5 schema; current Phase 6B context says those schema artifacts now exist remotely, but this audit file still does not replace full live runtime validation.
- **Dual models** (`topics`/`lessons`/`learning_paths` vs `courses`/`course_lessons`/`user_courses`/`edu_*`) remain as described in `PROJECT_AUDIT.md`.

### 2.5 Likely dead components (no imports outside defining file)

| File | Symbol |
|------|--------|
| `components/teacher/teacher-dashboard-client.tsx` | `TeacherDashboardClient` |
| `components/student/ai-roadmap-request-dialog.tsx` | `AiRoadmapRequestDialog` |
| `components/student/enrolled-course-card.tsx` | `EnrolledCourseCard` |
| `components/student/complete-lesson-button.tsx` | `CompleteLessonButton` |

Static grep only; confirm before deletion.

### 2.6 Duplicated / overlapping logic

- **Schedule row enrichment** duplicated between `app/api/study-schedule/route.ts` and `app/api/teacher/students/[id]/schedule/route.ts` — candidate for shared helper.
- **Two admin shells** for the same product role.
- **RPC `teacher_list_students_with_stats`:** returns students for any teacher/admin caller **without** filtering by teacher–student connection (see `015_teacher_access.sql`) — current roster behavior is effectively **all students**, even though completed-assessment and schedule-related flows are narrower.
- **Teacher connections API split:** `/teacher/connections` reads through `/api/teacher/connection-requests`, while client actions in `TeacherConnectionsManager` mutate `/api/connection-requests/*` — currently build-safe, but easy to drift in auth/behavior.
- **Teacher course editing entry points:** `new-v2` redirects into `/teacher/courses/[courseId]/edit-v2`, but the main course manager still exposes `curriculum` and modal edit actions rather than a direct link back to `edit-v2`.
- **Schedule enrichment vs analysis** is partly normalized: summary/analysis now share a helper, but lesson/course title enrichment is still duplicated between student and teacher schedule routes.

### 2.7 Migrations vs documented features

- **Phase 3 assessment columns:** additive migration now exists for `career_orientations.learner_profile`, `ai_analysis`, `analysis_source`, `assessment_version`.
- **Phase 5 teacher review events:** additive migration now exists for compact persisted teacher review snapshots and notes.
- **`teacher_insight_events`:** documented, not migrated (optional / future).
- **LLM insight endpoint** in `AI_INSIGHT_FLOW.md`: not implemented; no storage migration until product decides.

---

## 3. Completed (recent rework)

- **Student:** Nav and `/student` hub aligned to **four pillars**; auth unchanged; legacy URLs kept. See `STUDENT_REWORK_REPORT.md`.
- **Teacher:** Workspace sidebar, `/teacher/path-review`, `/teacher/schedule-insights`, `GET .../students/[id]/schedule`, combined path-review badge. See `TEACHER_REWORK_REPORT.md`.
- **Assessment:** `/assessment` now produces a structured learner profile with deterministic MBTI baseline plus server-side AI enrichment/fallback, while keeping legacy compatibility.
- **Personalized path + schedule foundation:** path suggestion now consumes structured assessment first, and `study_schedule` APIs expose additive deterministic analysis for student and teacher review.
- **Teacher review persistence:** teacher path review and schedule insight review now have compact append-only persistence without replacing `personalized_paths` or `study_schedule`.
- **Docs:** `AI_INSIGHT_FLOW.md` (data in / insight out / approval / persistence on current schema).
- **Build verification:** `npm run build` succeeded on **2026-04-16** for the current working tree; no current build failure was reproduced for `/teacher/connections` or `/teacher/courses/[courseId]/edit-v2`.

---

## 4. Incomplete / not at documented SOT

- **Data model unification** per `MIGRATION_MAP.md` / `MIGRATION_STRATEGY.md` (still in progress).
- **Persisted teacher AI insights** — table optional in target schema, not created.
- **Teacher UX consistency:** some newer teacher surfaces still mix Vietnamese and English copy, and route entry points are not fully normalized across classic course management vs `edit-v2`.
- **Learning source of truth is still split at runtime:** legacy course hub and teacher catalog run on `courses` / `course_lessons` / `user_courses` / `user_course_progress`, while Edu V2 runs on `edu_*`.
- **Schedule analytics is still read-time only:** no persisted snapshot/history table yet, and estimated hours remain `null` until the product defines a stable duration source.
- **Teacher review persistence is compact, not full snapshot history:** current review events intentionally store reduced context rather than complete schedule/path payloads.
- **Remote schema sync is no longer the stated blocker in Phase 6B context:** however, live environment validation and deeper production hardening are still outside this static audit.
- **Legacy student routes** still reachable; product may want redirects or retirement later.
- **Teacher student list semantics** (global vs connected) are still not tightened in API/RPC.

---

## 5. Residual risks

| Severity | Risk |
|----------|------|
| **High (if product assumes “my students”)** | `teacher_list_students_with_stats` scope vs connection-based roster. |
| **Medium** | Dual admin UIs and dual content models increase maintenance and regression cost. |
| **Medium** | Multiple schedule completion routes and deprecated alias — easy to diverge. |
| **Medium** | `/teacher/connections` depends on two API namespaces for one workflow; behavior/auth can drift even though build currently passes. |
| **Medium** | Local build pass still does not guarantee full remote runtime health; schema sync is no longer the stated blocker, but live validation/observability depth remains limited. |
| **Low** | `edit-v2` exists and builds, but teacher course management still centers on other edit flows. |
| **Low** | Legacy URLs bookmarked despite simplified nav. |
| **Low** | Dead components clutter the codebase. |

---

## 6. Next-step checklist (no new product scope)

1. **Product decision:** Should teacher APIs list **all** students or only **connected** students? Align RPC / RLS / filters.
2. **Normalize teacher route UX:** decide whether `edit-v2` should become a first-class edit path from the course manager or remain a secondary builder flow.
3. **Remove or wire** dead components after team confirmation.
4. **Extract** shared `study_schedule` enrichment helper.
5. **Execute / track** `MIGRATION_MAP.md` for single progress SOT (`learning_paths` vs v2).
6. **If LLM insights ship:** add API + optional `teacher_insight_events` migration per `DATA_TARGET_SCHEMA.md`.
7. **Production / remote validation:** keep verifying live runtime, RLS behavior, and operational observability even after Phase 3/5 schema sync is reported complete.
8. **Docs:** Point `PROJECT_AUDIT.md` readers to this file as **2026-04-16** snapshot.

---

## 7. Related documents

- `PROJECT_AUDIT.md`  
- `STUDENT_REWORK_REPORT.md`  
- `TEACHER_REWORK_REPORT.md`  
- `AI_INSIGHT_FLOW.md`  
- `PHASE_6B_STABILIZATION_REPORT.md`
- `REWORK_COMPLETION_STATUS.md`
- `DATA_TARGET_SCHEMA.md`, `MIGRATION_MAP.md`, `MIGRATION_STRATEGY.md`  

---

*This audit is a static code and documentation review; it does not replace Supabase RLS review on a live project or security penetration testing.*
