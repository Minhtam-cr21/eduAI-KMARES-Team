# Student area rework report

**Vietnamese summary:** Login/signup unchanged. The student hub and primary navigation are limited to four pillars: Courses, Personalized roadmap, Smart study schedule, and Profile. Teacher/admin code was not modified. No new data logic beyond the agreed schema. Legacy routes remain reachable but are off the main nav.

**Date:** 2026-04-16  
**Architecture references:** `TARGET_ARCHITECTURE.md`, `DATA_TARGET_SCHEMA.md`, `API_CONTRACTS.md`

## Scope (locked)

- **Auth:** `app/(auth)/…` — behavior unchanged.
- **Student shell:** `app/(student)/layout.tsx` — header logo links to `/student`; `StudentNav` shows only the four pillars (+ **Giáo viên** → `/teacher` when `profiles.role` is `teacher` or `admin`).
- **Hub:** `app/(student)/(dashboard)/student/page.tsx` — welcome, explore CTA, four module cards, short link to enrolled courses.
- **No teacher/admin edits** in this rework.
- **No new API/schema contracts** — UI and route structure only.

## Route mapping

### Primary navigation (before → after)

| Before (conceptual) | After | Notes |
| --- | --- | --- |
| Busy `/student` hub with many secondary blocks (quiz, assessments, connections, stats, carousels, etc.) | `/student` — minimal hub + four pillar cards | Heavy sections removed from the hub page. |
| Many student nav targets (quiz, assessment, connections, teachers, …) | Only `/student/courses`, `/personalized-roadmap`, `/study-schedule`, `/profile` (+ `/teacher` for dual-role users) | Implemented in `components/student/student-nav.tsx`. |
| `/dashboard` as role router | **Same URL** | Still redirects: student → `/student` (`app/(student)/dashboard/page.tsx`). |

### Four pillars (canonical URLs)

| Pillar | Route |
| --- | --- |
| Khóa học | `/student/courses` (explore: `/student/courses/explore`) |
| Lộ trình cá nhân hóa | `/personalized-roadmap` |
| Lịch học thông minh | `/study-schedule` |
| Profile | `/profile` |

### Legacy routes (still built; not in primary nav)

Deep links still work; they are **not** promoted in `StudentNav` or the simplified hub:

- `/quizzes`, `/assessment`, `/assessment/result`
- `/roadmaps`, `/roadmaps/[id]`, `/career`
- `/student/connections`, `/student/teachers`, `/student/teachers/[teacherId]`
- `/learn/[lessonId]`

`personalized-roadmap` may still link internally to `/assessment` when gating requires it (existing behavior; schema unchanged).

### Public landing

- Nav label **Quiz** → **Khóa học**: `/student/courses` if logged in, else `/login?next=/student/courses` (`components/landing/landing-header.tsx`).
- CTA **Dashboard** still targets `/student`.

## Component mapping

### Kept / reused

| Artifact | Role |
| --- | --- |
| `StudentNav` | Four links + optional teacher link. |
| `StudentDashboardModules` | Grid of four pillar cards (replaces prior hub modules). |
| `app/(student)/(dashboard)/student/page.tsx` | `/student` hub. |
| `app/(student)/layout.tsx` | Student chrome + metadata for the four pillars. |
| `app/(student)/study-schedule/page.tsx` | Schedule UI; title “Lịch học thông minh”; ghost link “Trang học sinh” → `/student`. |
| Course, profile, roadmap, learn pages | Route files unchanged; APIs unchanged in this pass. |

### Merged / simplified (at hub level)

- Former hub content (quiz blocks, 7-day charts, assessment/career/roadmap dialogs, suggested carousels, `StudentStatsCards` on dashboard, etc.) is **replaced** by a single layer: `StudentDashboardModules` with four `Link` cards.

### Removed from hub only (not deleted repo-wide)

- Inline widgets removed from `student/page.tsx`. Shared components such as `StudentStatsCards` still exist (e.g. `profile-stats-section.tsx`).

## UI flow (compact)

1. User hits `/dashboard` → redirected to **`/student`** (students).
2. **`/student`**: greeting, explore CTA, four pillar cards, footer link to `/student/courses`.
3. **Courses:** nav or cards → `/student/courses` or `/student/courses/explore` → existing course/lesson flows.
4. **Roadmap:** `/personalized-roadmap` (may flow to `/assessment` when needed).
5. **Schedule:** `/study-schedule`; back to hub via “Trang học sinh”.
6. **Profile:** `/profile`.

All `(student)` pages share the same header and four-item nav, so the mental model stays flat.

## Files touched

- `app/(student)/layout.tsx`
- `app/(student)/(dashboard)/student/page.tsx`
- `components/student/student-nav.tsx`
- `components/student/student-dashboard-modules.tsx`
- `app/(student)/study-schedule/page.tsx`
- `components/landing/landing-header.tsx`

## Build

- `npm run build` — **success** (exit code 0), Next.js 14.2.28.

## Optional follow-ups

- Rename landing CTA **Dashboard** → **Trang học sinh** for consistent copy with the schedule page.
- Decide whether to redirect or retire legacy student URLs; currently kept to avoid breaking bookmarks.
