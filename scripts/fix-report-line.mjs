import fs from "node:fs";
import path from "node:path";

const p = path.join(import.meta.dirname, "..", "STUDENT_REWORK_REPORT.md");
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
const idx = lines.findIndex((l) => l.startsWith("2. **`/student`**: "));
if (idx === -1) {
  console.error("line not found");
  process.exit(1);
}
lines[idx] =
  "2. **`/student`**: greeting, explore CTA, four pillar cards, footer link to `/student/courses`.";
fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("fixed line", idx + 1);
