import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Nhập email").email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Nhập mật khẩu")
    .min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const signupSchema = z.object({
  email: z.string().min(1, "Nhập email").email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Nhập mật khẩu")
    .min(6, "Mật khẩu tối thiểu 6 ký tự"),
  full_name: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
