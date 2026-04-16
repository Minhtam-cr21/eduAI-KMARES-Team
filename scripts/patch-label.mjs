import { readFileSync, writeFileSync } from "node:fs";
const p = "components/teacher/teacher-courses-manager.tsx";
let s = readFileSync(p, "utf8");
s = s.replace(
  /<Label htmlFor="c-high">[^<]+<\/Label>/,
  '<Label htmlFor="c-high">Highlights (m\u1ED7i d\u00F2ng)</Label>'
);
writeFileSync(p, s);
console.log("ok");
