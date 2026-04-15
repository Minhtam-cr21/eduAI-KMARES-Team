"use client";

import { BenefitsManager } from "@/components/teacher/benefits-manager";
import { CurriculumEditor } from "@/components/teacher/curriculum-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  courseId: string;
  courseTitle: string;
  courseIsPublished: boolean;
};

export function CourseCurriculumTabs({
  courseId,
  courseTitle,
  courseIsPublished,
}: Props) {
  return (
    <Tabs defaultValue="curriculum" className="w-full space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="curriculum">Giáo trình</TabsTrigger>
        <TabsTrigger value="benefits">Quyền lợi</TabsTrigger>
      </TabsList>
      <TabsContent value="curriculum" className="mt-0">
        <CurriculumEditor
          courseId={courseId}
          courseTitle={courseTitle}
          courseIsPublished={courseIsPublished}
        />
      </TabsContent>
      <TabsContent value="benefits" className="mt-0">
        <BenefitsManager courseId={courseId} />
      </TabsContent>
    </Tabs>
  );
}
