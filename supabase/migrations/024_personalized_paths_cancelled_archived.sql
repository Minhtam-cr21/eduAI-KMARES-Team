-- Bước 11: trạng thái hủy / lưu trữ (không xóa dữ liệu).

ALTER TABLE public.personalized_paths
  DROP CONSTRAINT IF EXISTS personalized_paths_status_check;

ALTER TABLE public.personalized_paths
  ADD CONSTRAINT personalized_paths_status_check
  CHECK (
    status IN (
      'draft',
      'pending',
      'pending_student_approval',
      'revision_requested',
      'approved',
      'rejected',
      'active',
      'paused',
      'cancelled',
      'archived'
    )
  );

COMMENT ON CONSTRAINT personalized_paths_status_check ON public.personalized_paths IS
  'cancelled/archived: ẩn khỏi học sinh (lịch + lộ trình); dữ liệu giữ nguyên.';
