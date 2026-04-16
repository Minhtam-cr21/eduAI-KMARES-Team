# EduAI — Kiến trúc đích (đề xuất, bám yêu cầu SP)

**Phạm vi:** tái tổ chức và làm rõ ranh giới; **không** mô tả tính năng mới ngoài: khóa học, lộ trình cá nhân hóa, lịch thông minh, profile (học sinh); giáo viên tạo khóa học + AI phân tích + insight + đề xuất lộ trình/lịch.

**CẦN XÁC NHẬN:** có giữ **admin** và các module **kết nối GV / roadmap công khai / quiz độc lập** ở layer nào (vận hành vs sản phẩm end-user).

---

## 1. Nguyên tắc

1. **Một “Learning core”** là nguồn sự thật cho tiến độ học sinh trên khóa học (hiện: `user_courses` / `user_course_progress` + `courses` / `course_lessons`; song song `edu_*` cần quyết định hợp nhất — **CẦN XÁC NHẬN** chọn nhánh canonical).
2. **Một “Personalization core”** cho chuỗi khóa/bài và trạng thái phê duyệt (`personalized_paths`) liên kết `study_schedule`.
3. **Một “Analytics / insight layer”** đọc `user_behavior`, quiz attempts, schedule completion, assessment outputs; tổng hợp và trình bày; **không** bịa metric ngoài dữ liệu có.
4. **AI qua server:** Route Handlers / server actions / edge (đúng hướng hiện tại).
5. **RLS bắt buộc**; job nội bộ / sync dùng service role có kiểm soát.

---

## 2. Khối kiến trúc logic

```
[Client Next.js]
    |
    v
[Middleware: session + coarse role]
    |
    +-- Student shell: Courses | Personalized path | Schedule | Profile
    |
    +-- Teacher shell: Course authoring | Student insights | Path/schedule collaboration
    |
    +-- (Optional) Admin shell -- CẦN XÁC NHẬN
    |
    v
[API boundary]
    |-- Learning APIs (enrollment, lesson, quiz)
    |-- Personalization APIs (path, suggest, approve, feedback)
    |-- Schedule APIs (complete, by-lesson)
    |-- Analytics APIs (aggregates for teacher)
    v
[Supabase Postgres + RLS + Auth]
    |-- study_schedule maintenance (Edge cron)
```

---

## 3. Mapping từ hiện trạng

| Hiện trạng | Hướng đích |
|-------------|------------|
| `topics`/`lessons`/`learning_paths` | **CẦN XÁC NHẬN:** freeze hoặc migrate sang Learning core; tránh song song lâu dài. |
| `courses` + `course_lessons` | Ứng viên Learning core chính (đang dùng UI học sinh). |
| `edu_*` + `/api/v2` | Hoặc tương lai canonical, hoặc pilot — **CẦN XÁC NHẬN**; tránh double-write. |
| `personalized_paths` + `study_schedule` | Personalization core — giữ. |
| `roadmaps` / `custom_roadmaps` / RAG | **CẦN XÁC NHẬN** thuộc nội dung công khai hay input AI cho GV. |

---

## 4. Trải nghiệm học sinh (4 mục)

- **Khóa học:** một entry point duy nhất trong nav chính; route hiện có có thể **giữ** nhưng **gom nhóm** dưới hub “Khóa học”.
- **Lộ trình cá nhân hóa:** hub hiển thị path đã duyệt + trạng thái; không thêm bước onboarding mới ngoài **CẦN XÁC NHẬN** (assessment có bắt buộc không).
- **Lịch học thông minh:** hub dùng `study_schedule` + hành động hoàn thành; edge giữ logic missed/slip.
- **Profile:** giữ `profiles` + form hiện có.

---

## 5. Trải nghiệm giáo viên

- **Authoring:** một luồng tạo/sửa khóa học (ưu tiên thế hệ UI đang bảo trì — **CẦN XÁC NHẬN** `v2` vs `courses`).
- **Insight:** một trang (hoặc tab) tổng hợp theo học sinh: tiến độ khóa, lịch, sự kiện hành vi, quiz — tái dùng API hiện có; chủ yếu **presentation**.
- **Collaboration AI:** giữ luồng đề xuất/chỉnh + duyệt `personalized_paths` và phản hồi học sinh; không thêm agent ngoài phạm vi.

---

## 6. Phi chức năng

- Observability: log lỗi API AI; giới hạn suggest.  
- Runbook: cron edge + GitHub Actions + biến môi trường Resend/Supabase.  
- Kiểm thử: contract API cho 4 pillar học sinh trước khi gỡ route phụ.

---

*Tài liệu định hướng; không đổi mã nguồn trong bước này.*
