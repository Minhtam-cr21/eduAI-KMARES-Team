# Teacher area rework report

**Date:** 2026-04-16  
**Scope:** Teacher dashboard only (`app/(dashboard)/teacher`, `components/teacher`, `app/api/teacher/*` additions). Student routes and shared APIs used read-only from the teacher side were not broken.

## Goals (product)

- Teachers **create and manage courses** (existing flows kept: `/teacher/courses`, curriculum, v2 builder).
- Teachers **manage students** (`/teacher/students`, detail pages, `/api/teacher/students`).
- **AI-assisted path and schedule tuning:** documented end-to-end in `AI_INSIGHT_FLOW.md`; UI adds **schedule + progress visibility** and **heuristic hints** (no new DB tables).
- **Path review** grouped under one hub: personalized paths + AI roadmaps pending approval.

## Workspace layout (new IA)

### Primary sidebar (top)

| Label | Route | Role |
| --- | --- | --- |
| Overview | `/teacher` | Dashboard home (unchanged). |
| Courses | `/teacher/courses` | Course CRUD / curriculum. |
| Students | `/teacher/students` | Roster + per-student pages. |
| Path review | `/teacher/path-review` | Hub linking to personalized paths + AI queue. |
| Schedule insights | `/teacher/schedule-insights` | Progress + `study_schedule` + heuristics. |

**Badge** on *Duyệt lộ trình*: count of `custom_roadmaps` with `status=pending` **plus** `personalized_paths` rows whose `status` is one of: `draft`, `pending`, `pending_student_approval`, `revision_requested`.

### Secondary (“Thêm”)

| Label            | Route                  |
|------------------|------------------------|
| Roadmap công khai | `/teacher/roadmaps`   |
| Bài học | `/teacher/lessons`     |
| Kết nối          | `/teacher/connections` |

**Notifications** remain on the **header bell** only (removed from sidebar to reduce noise).

## Route mapping

| Route | Change |
|-------|--------|
| `/teacher/path-review` | **New** — hub page (two cards → existing lists). |
| `/teacher/schedule-insights` | **New** — client UI + new read API below. |
| `/teacher/personalized-paths`, `/teacher/ai-roadmaps`, … | **Unchanged** URLs; linked from hub. |
| `/api/teacher/students/[id]/schedule` | **New** `GET` — teacher-visible `study_schedule` rows (RLS), with lesson/course enrichment. |

## Component / file changes

- `components/teacher/teacher-sidebar.tsx` — `useTeacherPrimaryNavItems`, `useTeacherSecondaryNavItems`, optional `secondaryItems` on desktop sidebar.
- `components/teacher/teacher-layout-shell.tsx` — merged **path review** badge (AI pending + workflow paths); passes primary + secondary nav; mobile menu uses full list.
- `components/teacher/teacher-nav-links.tsx` — `activePrefixes` + `isTeacherNavItemActive` so *Duyệt lộ trình* stays active on `/teacher/personalized-paths` and `/teacher/ai-roadmaps`.
- `components/teacher/teacher-header.tsx` — titles for `path-review` and `schedule-insights`.
- `components/teacher/teacher-schedule-insights-client.tsx` — **New** — selects student, loads `/api/teacher/students/:id/progress` + new schedule API; heuristic copy is **English** in UI (encoding-safe).
- `app/(dashboard)/teacher/path-review/page.tsx` — **New** hub (English copy).
- `app/(dashboard)/teacher/schedule-insights/page.tsx` — **New** shell page.
- `app/api/teacher/students/[id]/schedule/route.ts` — **New**.

## Student domain

No edits to `(student)` layout, nav, or student-only APIs beyond what the teacher UI **calls** (existing endpoints).

## Build

Run `npm run build` after pull.

## Follow-ups (optional)

- Localize `path-review` and `schedule-insights` headings to Vietnamese with a stable UTF-8 pipeline.
- Add a dedicated `POST /api/teacher/insights/...` LLM endpoint; contract sketched in `AI_INSIGHT_FLOW.md`.
