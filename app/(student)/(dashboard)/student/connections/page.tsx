import { redirect } from "next/navigation";

/** Route cũ: chuyển sang khám phá giáo viên dạng grid. */
export default function StudentConnectionsRedirectPage() {
  redirect("/student/teachers");
}
