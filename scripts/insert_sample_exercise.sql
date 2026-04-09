-- Mẫu INSERT exercise (sau migration 006).
-- Cách 1: Thay LESSON_UUID bằng id từ: SELECT id, title FROM lessons WHERE is_published = true;
-- Cách 2: Chạy một lần; nếu đã có bài cùng lesson + title thì bỏ qua.

INSERT INTO public.exercises (
  lesson_id,
  title,
  description,
  hint_logic,
  code_hint,
  initial_code,
  language,
  sample_input,
  sample_output,
  order_index
)
SELECT
  l.id,
  'In ra Hello (debugger)',
  E'## Yêu cầu\n\nIn ra dòng chữ bằng `print()`.\n\nThử chạy và sửa nếu có lỗi.',
  E'Dùng hàm `print` với chuỗi trong dấu ngoặc kép.',
  E'```python\nprint("Hello")\n```',
  'print("Hello, EduAI!")',
  'python',
  '',
  'Hello, EduAI!',
  1
FROM public.lessons l
INNER JOIN public.topics t ON t.id = l.topic_id
WHERE l.title = 'In ra màn hình'
  AND l.is_published = true
  AND t.is_published = true
  AND NOT EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.lesson_id = l.id AND e.title = 'In ra Hello (debugger)'
  )
RETURNING id, title, lesson_id;

-- Sau khi chạy: mở /debug?exerciseId=<id trả về> (đã đăng nhập học sinh).
