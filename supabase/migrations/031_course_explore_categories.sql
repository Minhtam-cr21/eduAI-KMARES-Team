-- Chu��n hoá courses.category cho màn explore (giá trị tiếng Anh c�� định).
-- Các giá trị h��p lệ: Algorithms, Basic Knowledge, Basic Programming, Advanced Programming, Problem Solving, Prompt Engineering.

UPDATE public.courses
SET category = 'Basic Programming'
WHERE lower(trim(category)) IN (
  'python', 'java', 'c++', 'c', 'sql', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'
);

UPDATE public.courses
SET category = 'Advanced Programming'
WHERE lower(trim(category)) IN (
  'frontend', 'backend', 'fullstack', 'full stack', 'vibe coding', 'web', 'mobile'
);

UPDATE public.courses
SET category = 'Prompt Engineering'
WHERE lower(trim(category)) IN ('prompt engineering', 'prompt');

UPDATE public.courses
SET category = 'Algorithms'
WHERE lower(trim(category)) IN (
  'algorithms', 'data structures', 'dsa', 'thuật toán', 'thuat toan'
);

UPDATE public.courses
SET category = 'Problem Solving'
WHERE lower(trim(category)) IN (
  'data', 'data science', 'machine learning', 'problem solving'
);

UPDATE public.courses
SET category = 'Basic Knowledge'
WHERE lower(trim(category)) IN (
  't��ng quát', 'tong quat', 'general', 'computer science', 'tin học đại cương'
);

COMMENT ON COLUMN public.courses.category IS
  'Danh mục explore: Algorithms | Basic Knowledge | Basic Programming | Advanced Programming | Problem Solving | Prompt Engineering (có thể còn chu��i legacy — app map hiển thị).';
