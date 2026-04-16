# AI insight flow — teacher adjustments to roadmap & smart schedule

This document specifies **what data an AI layer may read**, **what it should return**, **how a teacher approves or edits**, and **what is persisted**, using **existing** EduAI tables and APIs where possible. No new persistence model is required for a first LLM integration; optional future tables are noted at the end.

## Actors

- **Student** — completes assessment, accepts paths, completes lessons; owns `study_schedule` rows (`user_id = student`).
- **Teacher** — owns `personalized_paths.teacher_id` for paths they create; approves `custom_roadmaps`; triggers schedule generation.
- **System** — `generateStudySchedule` / approval pipelines already write `study_schedule` and enrollments.

## 1. Data the AI reads (inputs)

For a given **student** `student_id` and **teacher** `teacher_id`, the model context can be built from:

| Source | Contents | API / access |
|--------|-----------|--------------|
| Profile | `goal`, `hours_per_day`, `full_name` | `profiles` (teacher via existing progress API) |
| Assessment / orientation | Traits used for suggestions | Already used in `POST/GET /api/personalized-path/suggest` (`generatePathFromAssessment`) |
| Personalized path | `course_sequence`, `status`, `teacher_id` | `GET /api/personalized-path/teacher`, editor payloads |
| Learning path progress | Per-assignment `learning_paths` status, due dates | `GET /api/teacher/students/[id]/progress` |
| Study schedule | `due_date`, `status`, `miss_count`, `lesson_id`, `path_id` | `GET /api/teacher/students/[id]/schedule` (teacher RLS) |
| AI custom roadmap (optional) | `modules`, `reasoning`, `title` | `GET /api/teacher/custom-roadmaps` |
| Course catalog (optional) | Titles, ids for sequence proposals | Existing course list endpoints used by path editor |

**Constraint:** Only include rows the **teacher is allowed to see** (RLS). The schedule API already enforces teacher ownership via `personalized_paths`.

## 2. What the AI returns (outputs)

Structured JSON (suggested contract — implement as Zod in a future route):

```json
{
  "summary": "1-3 sentences for the teacher dashboard",
  "risk_level": "low | medium | high",
  "schedule_insights": [
    { "point": "string", "evidence": "optional short reference to dates or counts" }
  ],
  "path_recommendations": [
    {
      "action": "adjust_deadline | reorder_courses | split_lesson | pause_path | message_student",
      "detail": "human-readable instruction",
      "target_course_id": "uuid optional",
      "suggested_due_date_offset_days": 7
    }
  ],
  "roadmap_edit_suggestion": {
    "course_sequence": [ { "course_id": "uuid", "order_index": 0, "due_date_offset_days": 14 } ],
    "note_to_teacher": "why this sequence"
  }
}
```

Heuristic rules on `/teacher/schedule-insights` today are a **subset** of `schedule_insights` (no LLM).

## 3. Teacher review — approve / edit / reject

### 3.1 Personalized path (teacher-authored)

- Teacher edits in UI → `POST /api/personalized-path/teacher` with `courseSequence` + `status` (`draft` | `pending_student_approval`).
- **Persisted:** `personalized_paths.course_sequence`, `status`, `teacher_id`, timestamps.
- After student acceptance (existing student flow), **schedule regeneration** uses `generateStudySchedule` (already in repo).

### 3.2 AI custom roadmap (student-submitted)

- Teacher opens `/teacher/ai-roadmaps` → detail → **Approve** → `POST /api/teacher/custom-roadmaps/[id]/approve` (existing): creates/updates path, enrollments, **`study_schedule`**, notifications.
- **Reject / feedback:** existing fields such as `teacher_feedback` on `custom_roadmaps` (see approve route and related UI).
- **Persisted:** `custom_roadmaps.status`, `teacher_feedback`; downstream `personalized_paths`, `study_schedule`, enrollments.

### 3.3 Schedule-only tweaks

- There is **no** separate “AI schedule draft” table today. Adjustments land by:
  - Changing **path** (`course_sequence` / offsets) and regenerating schedule where the product allows, or
  - Operational follow-up (teacher messages student, manual lesson splits in curriculum).
- **Missed deadlines:** `miss_count` on `study_schedule` and edge functions (e.g. `handle-missed-deadlines`) already participate in lifecycle; AI can **recommend** threshold changes, not write `miss_count` directly unless you extend policy.

## 4. What gets stored (persistence map)

| Step | Storage |
|------|---------|
| Teacher saves edited sequence | `personalized_paths` |
| Student accepts path | status transition + may trigger `study_schedule` insert |
| Teacher approves AI roadmap | `custom_roadmaps` + path + enroll + `study_schedule` |
| Student completes lesson | `learning_paths`, possibly `study_schedule.status`, `completed_at` |
| LLM “insight only” (optional future) | Ephemeral — not stored unless you add `teacher_insight_runs` or append to `notifications` |

## 5. Suggested implementation order (engineering)

1. **Done:** Teacher reads schedule + progress in UI (`schedule-insights`).
2. **Next:** `POST /api/teacher/insights/analyze` with Zod body `{ studentId }`, server aggregates JSON from progress + schedule + path, calls OpenAI, returns the contract above (no DB write).
3. **Later:** Persist last insight per student/teacher in a small table or in `notifications` for audit.

## 6. Related code (pointers)

- Path suggestion: `app/api/personalized-path/suggest/route.ts`
- Path CRUD: `app/api/personalized-path/teacher/route.ts`
- Approve AI roadmap + schedule: `app/api/teacher/custom-roadmaps/[id]/approve/route.ts`
- Schedule generator: `lib/schedule/generator.ts`
- Student schedule (RLS): `study_schedule` policies in `supabase/migrations/20250413_add_personalization_tables.sql`
- Teacher schedule read: `app/api/teacher/students/[id]/schedule/route.ts`
