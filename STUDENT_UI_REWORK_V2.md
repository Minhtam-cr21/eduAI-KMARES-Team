# Student UI Rework V2

**Date:** 2026-04-16  
**Scope:** Upgrade Track 3 - Student Experience Rework  
**Rule:** giữ 4 pillar thực sự, không xóa legacy routes khi chưa chắc, ưu tiên server-first nếu hợp lý.

## 1. Mục tiêu

Track này tập trung làm rõ trải nghiệm học sinh theo đúng 4 pillar:

1. `Khóa học`
2. `Lộ trình cá nhân hóa`
3. `Lịch học thông minh`
4. `Profile`

Đồng thời:

- dashboard gọn và hữu ích hơn
- assessment result rõ hơn
- study schedule giải thích được priority / soft deadline / weekly load
- điều hướng mượt hơn bằng server-first data và loading state hợp lý

## 2. Navigation

Primary nav của student chỉ còn:

- `/student/courses`
- `/personalized-roadmap`
- `/study-schedule`
- `/profile`

Các route sau vẫn tồn tại nhưng không còn xuất hiện trong nav chính:

- `/career`
- `/quizzes`
- `/roadmaps`
- `/student/connections`

Chúng được xem là:

- legacy
- deep-link
- route tương thích tạm thời

## 3. Dashboard V2

`/student` không còn chỉ là hub chào mừng. Dashboard mới ưu tiên snapshot ngắn gọn:

- task hôm nay
- tình trạng tuần này
- tiến độ lộ trình
- alert lệch nhịp nếu có
- 4 pillar cards ở dưới cùng để giữ mental model đơn giản

Nguồn dữ liệu:

- `study_schedule`
- `personalized_paths`
- `user_courses`
- profile summary hiện có

Dashboard dùng helper server-first:

- `lib/student/dashboard.ts`

## 4. Assessment result

Nếu Track 1 đã có rubric/student view:

- dùng `student_view`
- dùng `rubric`
- giữ `learner_profile`, `ai_analysis`, baseline traits cho compatibility

Trang `assessment/result` được đổi sang server-first:

- bỏ fetch client-side khi mount
- redirect server-side nếu chưa có result hoặc chưa login
- thêm `loading.tsx`

## 5. Study schedule UI

Study schedule V2 ưu tiên giải thích thay vì chỉ liệt kê item:

- `priority`
- `soft_deadline_level`
- `weekly_load`
- `weekly_analysis`
- `adjustment_proposals`
- recommendation vì sao lịch thay đổi

Không làm full calendar app.

Calendar hiện vẫn giữ vai trò lightweight monthly view, nhưng item detail và weekly explanation rõ hơn.

## 6. Optimization

Các tối ưu chính:

- chuyển `assessment/result` sang server-first
- dashboard student lấy snapshot server-side thay vì chỉ render shell tĩnh
- study schedule page tiếp tục nhận initial snapshot server-side
- thêm route loading cho assessment result
- tránh thêm fetch lặp không cần thiết khi đã có data lúc render đầu

## 7. Compatibility

Track này giữ compatibility bằng cách:

- không xóa route legacy
- không đổi source of truth của path/schedule
- không đổi schema DB cho UI rework này
- chỉ thêm helper/read model và refactor presentation

## 8. CẦN XÁC NHẬN

- Team có muốn phase sau redirect một số legacy student URLs về 4 pillar chính không, hay tiếp tục giữ deep-link tự do?
- Dashboard hiện đang dùng roadmap progress ở mức compact; có muốn phase sau thêm explicit approved/active badge UI mạnh hơn không?
- Assessment result hiện đã server-first; có muốn phase sau ẩn bớt phần technical detail để trang nghiêng hẳn về student-facing tone hơn không?
