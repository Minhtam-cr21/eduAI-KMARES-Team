# EduAI — Chiến lược migration (không phá dữ liệu)

**Mục tiêu:** đưa client + server dần về SOT trong `DATA_TARGET_SCHEMA.md` và API `/api/eduai/v1`, **không** DROP/TRUNCATE bảng sản xuất.

---

## Nguyên tắc bắt buộc

1. Chỉ **ADD** bảng/cột/index; không xóa cột đang dùng.  
2. Đồng bộ dữ liệu **một chiều** (`edu_*` → `courses`/`course_lessons`) bằng job/backfill có idempotent.  
3. **Feature flag** chuyển UI từ API cũ sang `/api/eduai/v1`.  
4. Đóng freeze `edu_*` write path sau khi backfill + QA.

---

## Pha A — Chuẩn bị

- [ ] Xác định cutover: ngày bắt đầu chỉ đọc `courses` cho catalog chính.  
- [ ] Ghi nhận mapping PK: `edu_courses.id` → `courses.id` (bảng map `edu_id_map` additive — **CẦN XÁC NHẬN** có cần bảng bridge hay dùng cột `legacy_edu_course_id` ADD trên `courses`).

---

## Pha B — API song song

1. Implement `/api/eduai/v1/me/dashboard` đọc từ bảng SOT hiện có (không duplicate logic nghiệp vụ mới).  
2. Chuyển một màn hình pilot (ví dụ student home) sang API mới.  
3. Teacher insights bundle: tập trung query tại một service nội bộ.

---

## Pha C — Dữ liệu `edu_*`

| Bước | Hành động | Rủi ro |
|-------|-----------|--------|
| C1 | Export row counts + sample | Thiếu FK | 
| C2 | Backfill `courses`/`course_lessons` từ `edu_*` | Trùng slug/title — cần rule merge | 
| C3 | Backfill enrollment vào `user_courses` | Trùng unique — skip+log | 
| C4 | Đánh dấu ứng dụng: chỉ write `courses` | Regression nếu client cũ còn | 

Không xóa `edu_*` trong pha này.

---

## Pha D — Teacher insight persistence

- Tạo `teacher_insight_events` (ADD).  
- Dual-write: optional — chỉ persist khi GV bấm “Lưu phân tích”.

---

## Pha E — Dọn dẹp (sau khi ổn định)

- Deprecate route cũ bằng tài liệu + 410/redirect tùy chính sách.  
- **CẦN XÁC NHẬN** có nên đổi tên vật lý bảng `edu_*` thành `_deprecated_edu_*` (chỉ khi downtime cho phép).

---

## Kiểm thử tối thiểu

- [ ] Học sinh: dashboard mới khớp số liệu với query cũ trên cùng user.  
- [ ] GV: insights bundle = tổng các nguồn SOT.  
- [ ] Lịch: complete/missed không regress so với edge.  
- [ ] RLS: không lộ dữ liệu học sinh khác.

---

*Tài liệu chiến lược; không chứa lệnh SQL phá hoại.*
