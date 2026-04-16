# EduAI — Bản đồ migration / rework (không xóa code, không đổi tên hàng loạt)

**Mục tiêu:** lộ trình **dần** đưa hệ thống về kiến trúc đích trong `TARGET_ARCHITECTURE.md`, bám yêu cầu SP; **không** xóa file, **không** rename mass.

---

## Pha 0 — Quyết định cần khóa (CẦN XÁC NHẬN)

1. **Admin:** giữ hay thu hẹp?  
2. **Learning canonical:** `courses`/`course_lessons` **hay** `edu_*` **hay** hợp nhất sau?  
3. **Assessment / Quiz / Roadmap công khai / Connections:** vẫn là sản phẩm hay infra nội bộ?  
4. **Học sinh nav:** ẩn route (feature flag) hay gỡ khỏi UI chính nhưng giữ deep link?

---

## Pha 1 — Quan sát (không đổi tên)

- Gắn nhãn nội bộ: `legacy`, `parallel`, `canonical candidate`.  
- Thống kê client đang gọi API nào cho lịch (`study-schedule` vs `user/study-schedule`).  
- Inventory RLS: bảng nào cho teacher đọc học sinh.

---

## Pha 2 — Chuẩn hóa trải nghiệm 4 pillar (học sinh)

1. Một hub “Khóa học”: điều hướng từ `/student` và `student-nav`.  
2. Một hub “Lộ trình cá nhân hóa”: `/personalized-roadmap` + `personalized-path/*`.  
3. Một hub “Lịch”: `/study-schedule`.  
4. “Profile”: `/profile`.  
5. Màn hình khác: **CẦN XÁC NHẬN** secondary nav hoặc deep link.

---

## Pha 3 — Giáo viên: insight và đề xuất lộ trình

1. Tổng hợp view học sinh X từ: `teacher/students/[id]/progress`, `study_schedule`, `user_behavior`, quiz attempts.  
2. Không thêm loại đề xuất AI mới; chỉ tinh chỉnh prompt/tham số khi SP phê duyệt.  
3. Giữ luồng duyệt path; làm rõ trạng thái trong UI.

---

## Pha 4 — Dữ liệu: hợp nhất từng bước

| Nguồn | Hành động đề xuất | Ghi chú |
|-------|-------------------|---------|
| `learning_paths` | Đọc-only; không mở rộng | API cũ giữ theo .cursorrules |
| `personalized_paths` | Canonical cho CH | |
| `topics`/`lessons` | Freeze hoặc migrate sau | **CẦN XÁC NHẬN** |
| `edu_*` | Song song có kiểm soát | Tránh double enrollment |
| `mbti_results` vs `career_orientations` | Hợp nhất sau | |

Mỗi bước SQL: ưu tiên **thêm** cột/bảng bridge; không **drop** trong pha này (theo yêu cầu không xóa tùy tiện — **CẦN XÁC NHẬN** policy xóa dữ liệu).

---

## Pha 5 — API surface

- Không đổi tên hàng loạt endpoint; nếu cần API mới, **thêm** route, deprecate bằng tài liệu.  
- Có thể chuẩn hóa một family `/api/learning/*` **sau** khi chọn canonical.

---

## Pha 6 — Dọn dẹp (sau khi SP khóa phạm vi)

- Khi an toàn: **archive** code legacy (không xóa) — nằm ngoài yêu cầu hiện tại “không xóa code” của audit.

---

## Checklist kiểm

- [ ] Học sinh thấy 4 pillar trên nav chính — **CẦN XÁC NHẬN**  
- [ ] Giáo viên tạo/sửa khóa học không regress  
- [ ] `study_schedule` + cron vẫn chạy  
- [ ] RLS: học sinh không đọc dữ liệu người khác  
- [ ] Không hardcode secret; AI chỉ server-side

---

*Tài liệu lập kế hoạch; không thực hiện xóa/đổi tên hàng loạt trong repo tại bước audit.*
