import { redirect } from "next/navigation";

/** `/admin` → trang quản lý chủ đề mặc định */
export default function AdminIndexPage() {
  redirect("/admin/topics");
}
