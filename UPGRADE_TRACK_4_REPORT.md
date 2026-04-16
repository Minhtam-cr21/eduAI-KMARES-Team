# Upgrade Track 4 Report

**Date:** 2026-04-16  
**Track:** Teacher Workspace Rework

## 1. Mục tiêu phase

- làm teacher workspace gọn hơn theo IA mới
- đẩy workflow chính về từng học sinh
- gắn assessment + path + schedule + review history vào cùng một luồng can thiệp
- giữ compatibility route và không đổi teacher roster semantics

## 2. File đã sửa

- `app/(dashboard)/teacher/layout.tsx`
- `app/(dashboard)/teacher/students/page.tsx`
- `app/(dashboard)/teacher/students/[studentId]/page.tsx`
- `app/(dashboard)/teacher/path-review/page.tsx`
- `app/(dashboard)/teacher/schedule-insights/page.tsx`
- `components/teacher/teacher-sidebar.tsx`
- `components/teacher/teacher-header.tsx`
- `components/teacher/teacher-students-table.tsx`
- `components/teacher/teacher-dashboard-home-tabs.tsx`
- `components/teacher/teacher-schedule-insights-client.tsx`
- `lib/teacher/student-workspace.ts`
- `TEACHER_WORKSPACE_V2.md`

## 3. Những gì đã hoàn thành

### IA teacher mới

- Nav chính giờ giữ đúng 6 mục:
  - `Tổng quan`
  - `Khóa học`
  - `Học sinh`
  - `Duyệt lộ trình`
  - `Lịch học & can thiệp`
  - `Thông báo`
- `roadmaps`, `ai-roadmaps`, `connections`, `lessons`, `personalized-paths` đã bị hạ khỏi primary nav.

### Student-centered workflow

- `/teacher/students` được chỉnh copy để rõ đây là entry point vào intervention workspace.
- `/teacher/students/[studentId]` được refactor thành server-first workspace theo học sinh, hiển thị:
  - assessment summary
  - progress snapshot
  - path suggestion / current path
  - weekly schedule analysis
  - recommendations
  - review history
  - action panel

### Path / schedule surfaces

- `/teacher/path-review` được chỉnh copy để trở thành workflow hub hỗ trợ, không cạnh tranh với student workspace.
- `/teacher/schedule-insights` được đổi IA/copy thành `Lịch học & can thiệp`.
- `teacher-schedule-insights-client` được thêm CTA quay về student workspace tương ứng.

### Helper dữ liệu mới

- thêm `lib/teacher/student-workspace.ts` để gom dữ liệu assessment, path, schedule, progress và review history cho student workspace.

## 4. Những gì chưa làm

- chưa biến toàn bộ CTA trong teacher area thành deep link trực tiếp về `/teacher/students/[studentId]`
- chưa redesign lớn teacher overview
- chưa thay đổi semantics roster `all students` vs `connected students`

Các mục này nằm ngoài phạm vi Track 4 hiện tại.

## 5. Compatibility giữ như thế nào

- không xóa route legacy teacher
- không đổi DB schema
- không đổi `personalized_paths` làm SOT path
- không đổi `study_schedule` làm SOT schedule
- không merge classic learning stack với `edu_*`
- không đổi teacher roster semantics hiện tại

## 6. Kiểm tra build/lint/test

- `ReadLints` sẽ được chạy trên các file đã sửa
- `npm run build` được chạy sau cùng theo yêu cầu

## 7. Rủi ro còn lại

- Student workspace mới phụ thuộc đồng thời vào assessment/path/schedule helpers, nên nếu một domain sau này đổi contract có thể kéo theo teacher detail page.
- Teacher overview vẫn còn mang tính dashboard nhiều hơn workflow; về mặt UX vẫn có thể khiến teacher bắt đầu từ overview thay vì từ học sinh.
- Teacher APIs hiện tại vẫn giữ roster semantics cũ, nên “workspace theo học sinh” chưa đồng nghĩa với “my students only”.

## 8. CẦN XÁC NHẬN

- Team có muốn giai đoạn sau chuẩn hóa CTA toàn teacher area về canonical student workspace không?
- `Thông báo` hiện đã nằm trong nav chính theo prompt Track 4; team có muốn tiếp tục giữ cả nav entry và header bell cùng lúc không?
