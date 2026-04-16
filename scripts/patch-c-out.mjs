import { readFileSync, writeFileSync } from "node:fs";
const p = "components/teacher/teacher-courses-manager.tsx";
let s = readFileSync(p, "utf8");
s = s.replace(
  /<Label htmlFor="c-out">[^<]+<\/Label>/,
  '<Label htmlFor="c-out">K\u1EBFt qu\u1EA3 sau h\u1ECDc (m\u1ED7i d\u00F2ng)</Label>'
);
writeFileSync(p, s);
