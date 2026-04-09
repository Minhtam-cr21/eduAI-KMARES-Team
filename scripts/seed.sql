-- Seed data: chạy một lần trên Supabase SQL Editor (hoặc supabase db push)
-- Tạo topic "Python cơ bản" + 2 bài học mẫu.

DO $$
DECLARE
  v_topic_id UUID;
  v_lesson_print_id UUID;
BEGIN
  -- Chèn topic nếu chưa tồn tại
  SELECT id INTO v_topic_id FROM public.topics WHERE title = 'Python cơ bản';

  IF v_topic_id IS NULL THEN
    INSERT INTO public.topics (title, description, order_index, is_published)
    VALUES (
      'Python cơ bản',
      'Khóa học nhập môn Python: từ cú pháp đơn giản đến cấu trúc dữ liệu cơ bản.',
      1,
      true
    )
    RETURNING id INTO v_topic_id;
    RAISE NOTICE 'Topic created: %', v_topic_id;
  ELSE
    RAISE NOTICE 'Topic already exists: %', v_topic_id;
  END IF;

  -- Bài 1: In ra màn hình
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE topic_id = v_topic_id AND title = 'In ra màn hình'
  ) THEN
    INSERT INTO public.lessons (topic_id, title, order_index, is_published, content)
    VALUES (
      v_topic_id,
      'In ra màn hình',
      1,
      true,
      E'# In ra màn hình với print()\n\nPython dùng hàm `print()` để hiển thị kết quả.\n\n## Ví dụ\n\n```python\nprint("Xin chào!")\nprint("Tên tôi là", "EduAI")\nprint(1 + 2)\n```\n\n## Giải thích\n\n- `print("Xin chào!")` — in chuỗi ký tự.\n- Có thể in nhiều giá trị cách nhau bằng dấu phẩy.\n- Biểu thức trong `print()` sẽ được tính trước khi in.\n\n## Bài tập nhỏ\n\nViết code in ra:\n1. Tên của bạn\n2. Kết quả phép tính `5 * 7`'
    );
    RAISE NOTICE 'Lesson 1 inserted';
  END IF;

  -- Bài 2: Biến và kiểu dữ liệu
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons WHERE topic_id = v_topic_id AND title = 'Biến và kiểu dữ liệu'
  ) THEN
    INSERT INTO public.lessons (topic_id, title, order_index, is_published, content)
    VALUES (
      v_topic_id,
      'Biến và kiểu dữ liệu',
      2,
      true,
      E'# Biến và kiểu dữ liệu\n\nBiến giúp lưu trữ dữ liệu để dùng lại.\n\n## Khai báo biến\n\n```python\nten = "An"\ntuoi = 16\ndiem_tb = 8.5\nda_dang_ky = True\n```\n\n## Kiểu dữ liệu phổ biến\n\n| Kiểu | Ví dụ | Ghi chú |\n|------|-------|--------|\n| `str` | `"hello"` | Chuỗi ký tự |\n| `int` | `42` | Số nguyên |\n| `float` | `3.14` | Số thực |\n| `bool` | `True/False` | Đúng / Sai |\n\n## Kiểm tra kiểu\n\n```python\nprint(type(ten))      # <class ''str''>\nprint(type(tuoi))     # <class ''int''>\n```\n\n## Bài tập nhỏ\n\nTạo 3 biến: tên (str), tuổi (int), điểm (float) và in ra bằng `print()`.'
    );
    RAISE NOTICE 'Lesson 2 inserted';
  END IF;

  -- Exercise mẫu (1 bài) gắn bài "In ra màn hình" — bỏ qua nếu đã có.
  SELECT id INTO v_lesson_print_id
  FROM public.lessons
  WHERE topic_id = v_topic_id AND title = 'In ra màn hình'
  LIMIT 1;

  IF v_lesson_print_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.exercises e
       WHERE e.lesson_id = v_lesson_print_id AND e.title = 'In ra Hello (debugger)'
     )
  THEN
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
    ) VALUES (
      v_lesson_print_id,
      'In ra Hello (debugger)',
      E'## Yêu cầu\n\nIn ra dòng chữ bằng `print()`.\n\nThử chạy và sửa nếu có lỗi.',
      E'Dùng hàm `print` với chuỗi trong dấu ngoặc kép.',
      E'```python\nprint("Hello")\n```',
      'print("Hello, EduAI!")',
      'python',
      '',
      'Hello, EduAI!',
      1
    );
    RAISE NOTICE 'Sample exercise inserted for lesson In ra màn hình';
  END IF;
END;
$$;
