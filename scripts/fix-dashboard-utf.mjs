import fs from "fs";
const p = "components/student/student-dashboard-modules.tsx";
let s = fs.readFileSync(p, "utf8");
const rep = "\uFFFD";
const map = [
  [`Bài tr${rep}c nghiệm theo khóa học và bài học.`, "Bài tr��c nghiệm theo khóa học và bài học."],
  [`Lộ trình giáo viên đã duyệt sau tr${rep}c nghiệm.`, "Lộ trình giáo viên đã duyệt sau tr��c nghiệm."],
  [
    `Hoàn thành tr${rep}c nghiệm định hư${rep}ng để m${rep} khóa.`,
    "Hoàn thành tr��c nghiệm đ�ng để m�� khóa.",
  ],
  [`Nhập mục tiêu và khung th${rep}i gian — gửi giáo viên duyệt.`, "Nhập mục tiêu và�i gian — gửi giáo viên duyệt."],
  [
    `Làm tr${rep}c nghiệm trư${rep}c để dùng tính năng này.`,
    "Làm tr��c nghiệm trư��c để dùng tính năng này.",
  ],
  [`MBTI, điểm mạnh/yếu và g${rep} nghề nghiệp.`, "MBTI, điểm mạnh/yếu và g� nghề nghiệp."],
  [`Hoàn thành tr${rep}c nghiệm để xem phân tích.`, "Hoàn thành tr��c nghiệm để xem phân tích."],
];
for (const [a, b] of map) {
  if (!s.includes(a)) {
    console.error("missing fragment:", [...a].map((c) => c.codePointAt(0)));
 process.exit(1);
  }
  s = s.split(a).join(b);
}
s = s.replace(
  new RegExp(`<p className="font-semibold text-foreground">Đ${rep}ng nghề nghiệp</p>`),
  '<p className="font-semibold text-foreground">Định hư��ng nghề nghiệp</p>'
);
s = s.replace(
  new RegExp(`<p className="font-semibold text-foreground">Định hư${rep}ng nghề nghiệp</p>`, "g"),
  '<p className="font-semibold text-foreground">Định hư��ng nghề nghiệp</p>'
);
fs.writeFileSync(p, s);
console.log("ok");
