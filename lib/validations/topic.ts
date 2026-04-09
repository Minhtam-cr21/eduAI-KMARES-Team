import { z } from "zod";

/** Chuỗi an toàn: null/undefined → "" — tránh Zod báo "expected string, received undefined". */
const stringish = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : String(v)));

/**
 * Form tạo/sửa topic (không có id).
 * `order_index`: coerce từ input number / string.
 */
export const topicFormSchema = z.object({
  title: stringish.pipe(z.string().trim().min(1, "Nhập tiêu đề")),
  description: stringish,
  order_index: z.coerce.number().int("Thứ tự phải là số nguyên"),
  is_published: z.boolean(),
});

export type TopicFormValues = z.infer<typeof topicFormSchema>;

/** Payload cập nhật: bắt buộc có id UUID. */
export const topicUpdateSchema = topicFormSchema.extend({
  id: z.string().uuid("ID topic không hợp lệ (UUID)"),
});

export type TopicUpdateValues = z.infer<typeof topicUpdateSchema>;
