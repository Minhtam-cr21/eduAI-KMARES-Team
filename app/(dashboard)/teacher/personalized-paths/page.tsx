import { PersonalizedPathsListClient } from "@/components/teacher/personalized-paths-list-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function TeacherPersonalizedPathsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Lộ trình cá nhân hóa</CardTitle>
          <CardDescription>
            Danh sách học sinh và trạng thái lộ trình (nháp, chờ học sinh, góp
            ý, đang học).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalizedPathsListClient />
        </CardContent>
      </Card>
    </main>
  );
}
