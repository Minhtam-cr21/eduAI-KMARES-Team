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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Lộ trình cá nhân hóa
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Danh sách học sinh và trạng thái lộ trình (nháp, chờ học sinh, góp ý,
          đang học).
        </p>
      </div>
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Danh sách</CardTitle>
          <CardDescription>
            Chọn học sinh để xem hoặc chỉnh sửa course sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalizedPathsListClient />
        </CardContent>
      </Card>
    </div>
  );
}
