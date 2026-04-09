-- Đồng bộ bảng `lessons` với spec quản trị (chạy an toàn nhiều lần).
-- Schema gốc: 001_initial_schema.sql — bảng đã tồn tại; migration này chỉ bổ sung default / kiểm tra.

ALTER TABLE public.lessons
  ALTER COLUMN order_index SET DEFAULT 0;

ALTER TABLE public.lessons
  ALTER COLUMN created_at SET DEFAULT NOW();

COMMENT ON TABLE public.lessons IS 'Bài học thuộc topic; xóa lesson cascade exercises (006_exercises.sql).';
