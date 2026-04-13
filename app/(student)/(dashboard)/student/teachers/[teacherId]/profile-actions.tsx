"use client";

import { ConnectTeacherDialog } from "@/components/connection/connect-teacher-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TeacherProfileActions({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Kết nối
      </Button>
      <ConnectTeacherDialog
        open={open}
        onOpenChange={setOpen}
        teacherId={teacherId}
        teacherName={teacherName}
      />
    </>
  );
}
