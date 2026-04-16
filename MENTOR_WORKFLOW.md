# Mentor Workflow

## Vai trò
- Mentor không code trực tiếp theo mặc định.
- Mentor chịu trách nhiệm:
  - đọc toàn bộ thư mục trước và sau mỗi phase,
  - tạo prompt mạnh, rõ phạm vi cho Cursor,
  - review kết quả,
  - phát hiện lệch kế hoạch,
  - cập nhật hướng đi.

## Vòng lặp chuẩn
1. Chốt mục tiêu phase.
2. Mentor đọc codebase liên quan.
3. Mentor viết prompt cho Cursor.
4. Cursor code trong phạm vi phase.
5. Cursor cập nhật báo cáo markdown.
6. Mentor đọc lại toàn bộ thư mục liên quan.
7. Mentor kết luận:
   - đạt,
   - đạt một phần,
   - lệch kế hoạch,
   - cần rollback/chỉnh sửa.

## Tiêu chuẩn review
- Đúng phạm vi phase.
- Không phá domain khác.
- Không nói quá so với build/runtime thực tế.
- Có file báo cáo và tài liệu liên quan.
- Có khả năng tiếp tục sang phase sau.

## Nguyên tắc ra prompt
- Một prompt chỉ nên có một mục tiêu chính.
- Nếu là refactor lớn, phải chia phase nhỏ.
- Prompt luôn phải nêu rõ:
  - phạm vi được sửa,
  - phạm vi không được đụng,
  - file tài liệu phải đọc,
  - đầu ra cần tạo,
  - kiểm tra cần chạy.
