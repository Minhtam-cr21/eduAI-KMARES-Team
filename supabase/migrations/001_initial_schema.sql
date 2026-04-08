-- EduAI: schema ban đầu (profiles, topics, lessons, learning_paths, code_submissions)
-- Chạy qua Supabase SQL Editor hoặc: npx supabase db push (sau khi link project)

-- Bảng profiles (mở rộng auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  goal TEXT,
  hours_per_day INT DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng learning_paths (gán bài học cho học sinh)
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, lesson_id)
);

-- Bảng code_submissions (lưu lịch sử debug)
CREATE TABLE IF NOT EXISTS code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  output TEXT,
  error TEXT,
  ai_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Enable row level security trên tất cả bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: mỗi user chỉ xem và sửa được profile của mình
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Topics & Lessons: ai cũng xem được nếu is_published = true
CREATE POLICY "Anyone can view published topics" ON topics
  FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published lessons" ON lessons
  FOR SELECT USING (is_published = true);

-- Learning paths: học sinh chỉ xem của mình
CREATE POLICY "Students view own learning paths" ON learning_paths
  FOR SELECT USING (auth.uid() = student_id);
-- (Sau này thêm policy để admin/teacher có thể xem)

-- Code submissions: học sinh xem và thêm submissions của mình
CREATE POLICY "Users view own submissions" ON code_submissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own submissions" ON code_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: tự động tạo profile khi user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
