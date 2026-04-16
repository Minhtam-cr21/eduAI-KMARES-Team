# Upgrade Track 3 Report

**Date:** 2026-04-16  
**Track:** Student Experience Rework  

## 1. Mục tiêu phase

- Student chỉ còn 4 pillar thực sự trong nav chính
- Dashboard gọn, hữu ích hơn
- Assessment result và study schedule UI rõ hơn
- Điều hướng mượt hơn bằng server-first data và loading/skeleton hợp lý

## 2. File đã sửa

- `lib/student/dashboard.ts`
- `app/(student)/(dashboard)/student/page.tsx`
- `components/student/student-dashboard-modules.tsx`
- `app/(student)/study-schedule/page.tsx`
- `app/(student)/study-schedule/study-schedule-client.tsx`
- `components/calendar/study-calendar.tsx`
- `app/(student)/assessment/result/page.tsx`
- `app/(student)/assessment/result/loading.tsx`
- `STUDENT_UI_REWORK_V2.md`

## 3. Những gì đã hoàn thành

### Navigation

Nav chính tiếp tục giữ đúng 4 pillar:

- Khóa học
- Lộ trình cá nhân hóa
- Lịch học thông minh
- Profile

Các route:

- `career`
- `quizzes`
- `roadmaps`
- `student/connections`

không được đưa lại vào nav chính.

### Student dashboard

Đã nâng `/student` thành dashboard snapshot thật sự:

- task hôm nay
- tình trạng tuần này
- tiến độ lộ trình
- alert lệch nhịp nếu có
- vẫn giữ block 4 pillar để điều hướng rõ

Dashboard dùng helper server-first mới:

- `lib/student/dashboard.ts`

### Assessment result

Đã tận dụng rubric/student view từ Track 1:

- `student_view.headline`
- `student_view.summary`
- `student_view.pacing_recommendation`
- `rubric`

Trang `assessment/result` đã được đổi từ client fetch-on-mount sang server-first.

### Study schedule UI

Đã hiển thị rõ hơn:

- `priority`
- `soft_deadline_level`
- weekly load
- weekly risk / slip / imbalance
- reason proposal / suggested action khi lịch thay đổi

Không làm full calendar app; vẫn giữ calendar lightweight.

### Optimization

Đã giảm fetch lặp ở:

- `assessment/result` bằng server-first load
- `student` dashboard bằng helper server snapshot

Đã thêm:

- `app/(student)/assessment/result/loading.tsx`

## 4. Compatibility giữ như thế nào

- Không xóa route legacy
- Route legacy vẫn hoạt động như deep-link
- Không đổi schema DB trong phase UI này
- Không đổi source of truth hiện có của path/schedule

## 5. Kiểm tra đã chạy

- `ReadLints` cho các file sửa chính: pending final verify below
- `npm run build`: pending final verify below

## 6. Rủi ro còn lại

- Dashboard roadmap progress hiện vẫn là compact summary, chưa phải progress engine đầy đủ.
- Legacy routes vẫn tồn tại nên mental model tổng thể của repo vẫn chưa hoàn toàn “chỉ 4 pillar” ở mức routing.
- Study schedule UI đã rõ hơn nhưng vẫn phụ thuộc vào current V2 deterministic signals; chưa có full history timeline riêng.

## 7. CẦN XÁC NHẬN

- Có muốn phase sau redirect một số legacy student URLs về canonical pillar routes không?
- Dashboard có nên tiếp tục được nâng thành “single overview” sâu hơn, hay giữ mức gọn như hiện tại?
- Assessment result có nên tiếp tục giảm bớt technical sections trong phase sau không?
