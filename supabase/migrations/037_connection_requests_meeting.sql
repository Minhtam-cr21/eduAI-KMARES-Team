-- Meeting room / class code for teacher-student connections (Jitsi or custom).

ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS meeting_code TEXT;

ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

COMMENT ON COLUMN public.connection_requests.meeting_code IS 'Mã lớp / mã phòng hiển thị cho học sinh.';
COMMENT ON COLUMN public.connection_requests.meeting_link IS 'URL tham gia (ví dụ Jitsi Meet).';
