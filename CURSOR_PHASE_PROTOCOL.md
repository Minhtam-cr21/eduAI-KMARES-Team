# Cursor Phase Protocol

## Trước khi code
- Đọc:
  - `PROJECT_AUDIT.md`
  - `TARGET_ARCHITECTURE.md`
  - `FINAL_REWORK_AUDIT.md`
  - tài liệu phase được nhắc trong prompt
- Tóm tắt phạm vi sẽ làm.
- Liệt kê file dự kiến sửa.

## Trong khi code
- Chỉ sửa trong phạm vi prompt.
- Không tự mở rộng sản phẩm.
- Không tự xóa code legacy trừ khi prompt yêu cầu rõ.
- Nếu phát hiện mâu thuẫn giữa docs và code:
  - ưu tiên code thực tế,
  - ghi rõ trong báo cáo.

## Sau khi code
- Chạy kiểm tra phù hợp:
  - `npm run build` nếu thay route/layout/page/API quan trọng
  - hoặc kiểm tra thay thế có giải thích
- Tạo/cập nhật file báo cáo phase.

## Mẫu báo cáo tối thiểu
- Mục tiêu phase
- File đã sửa
- Những gì đã hoàn thành
- Những gì chưa hoàn thành
- Kết quả kiểm tra build/lint/test
- Rủi ro còn lại
- CẦN XÁC NHẬN
