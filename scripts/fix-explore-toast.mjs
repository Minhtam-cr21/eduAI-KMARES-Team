import { readFileSync, writeFileSync } from "node:fs";
const p = "app/(student)/student/courses/explore/page.tsx";
let s = readFileSync(p, "utf8");
s = s.replace(
  /toast\.error\(e instanceof Error \? e\.message[\s\S]*?\);/,
  'toast.error(e instanceof Error ? e.message : "L\u1ED7i m\u1EA1ng");'
);
writeFileSync(p, s);
