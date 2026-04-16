# Teacher Workspace V2

**Date:** 2026-04-16  
**Scope:** Upgrade Track 4 - Teacher Workspace Rework.  
**Rule:** giữ compatibility route nếu có thể, không đổi teacher roster semantics, không merge classic/v2 learning stack.

## 1. Mục tiêu

Teacher Workspace V2 gom luồng làm việc chính về từng học sinh thay vì để teacher phải nhảy qua nhiều màn rời rạc:

1. đọc assessment summary
2. xem path suggestion / current path
3. đọc weekly schedule analysis
4. xem recommendations và review history
5. thực hiện action tiếp theo từ một action panel rõ ràng

Track này là IA/UI rework cho teacher surfaces chính, không mở rộng product scope mới.

## 2. Teacher IA mới

### Nav chính

Nav chính chỉ giữ:

- `Tổng quan`
- `Khóa học`
- `Học sinh`
- `Duyệt lộ trình`
- `Lịch học & can thiệp`
- `Thông báo`

### Hạ khỏi nav chính

Các route sau được giữ để tương thích nhưng không còn ở primary nav:

- `roadmaps`
- `ai-roadmaps`
- `connections`
- `lessons`
- `personalized-paths`

Các route này vẫn có thể đi vào từ secondary access hoặc từ workflow hub tương ứng.

## 3. Workspace theo từng học sinh

Canonical workflow mới nằm ở:

- `/teacher/students`
- `/teacher/students/[studentId]`

### `/teacher/students`

Trang danh sách học sinh giờ được copy hóa rõ hơn:

- mục tiêu là mở intervention workspace
- teacher chọn học sinh để đi tiếp vào luồng review

### `/teacher/students/[studentId]`

Trang này trở thành student-centered workspace, gồm:

- `assessment summary`
- `progress snapshot`
- `action panel`
- tab `path suggestion`
- tab `weekly schedule analysis`
- tab `review history`

Nguồn dữ liệu:

- assessment: `career_orientations`
- path: `personalized_paths` + path suggestion helper
- schedule: `study_schedule` snapshot V2
- review history: `teacher_review_events`

Teacher vẫn dùng các màn hiện có để chỉnh path hoặc lưu schedule review, nhưng quyết định được đặt trong cùng một bối cảnh học sinh.

## 4. Vai trò của các teacher surfaces khác

### `/teacher`

Giữ vai trò overview, không còn là nơi chứa workflow chính. Copy được chỉnh để hướng teacher về luồng theo học sinh.

### `/teacher/path-review`

Giữ vai trò hub cho:

- personalized paths
- AI roadmap queue

Nhưng tài liệu và copy mới nhấn mạnh rằng đây là queue/hub hỗ trợ. Khi cần quyết định can thiệp cho một học sinh cụ thể, teacher nên quay về workspace học sinh.

### `/teacher/schedule-insights`

Giữ vai trò surface hỗ trợ đọc lịch và lưu review nhanh. IA và copy được đổi thành `Lịch học & can thiệp` để phản ánh đúng vai trò mới.

## 5. Compatibility giữ như thế nào

- không xóa route cũ
- không đổi semantics roster hiện tại
- không đổi SOT:
  - `personalized_paths` vẫn là SOT cho path
  - `study_schedule` vẫn là SOT cho schedule
- `teacher_review_events` vẫn là audit/workflow layer
- không merge nhánh classic learning stack với `edu_*`

## 6. CẦN XÁC NHẬN

- Team có muốn phase sau biến `/teacher/students/[studentId]` thành canonical entry point cho mọi CTA từ `path-review` và `schedule-insights` hay chỉ giữ ở mức soft guidance như hiện tại?
- `Thông báo` hiện đã vào nav chính theo yêu cầu Track 4; team có muốn bỏ icon-only emphasis ở header trong phase sau để tránh lặp entry point không?
