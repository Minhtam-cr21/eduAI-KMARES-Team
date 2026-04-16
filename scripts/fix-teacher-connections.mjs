import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "../components/teacher/teacher-connections-manager.tsx");
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function removeBetween(startNeedle, endNeedle) {
  const a = s.indexOf(startNeedle);
  const b = s.indexOf(endNeedle);
  if (a === -1 || b === -1 || b <= a) {
    throw new Error(`removeBetween: ${startNeedle.slice(0, 40)} -> ${endNeedle.slice(0, 40)} | ${a} ${b}`);
  }
  s = s.slice(0, a) + s.slice(b);
}

// Drop respond dialog; keep reject dialog (starts at <Dialog + newline + open rejectCtx)
removeBetween(
  "      <Dialog open={!!respondId}",
  "      <Dialog\n        open={!!rejectCtx}"
);

removeBetween(
  "      <Dialog\n        open={!!editLinkId}",
  "      <Dialog open={!!deleteId}"
);

const oldPend = `                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => setRespondId(r.id)}>
                        Chấp nhận
                      </Button>`;
const newPend = `                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={loading}
                        onClick={() => void acceptAndCreateRoom(r.id, false)}
                      >
                        <Video className="h-3.5 w-3.5" />
                        Tạo phòng họp
                      </Button>`;
if (!s.includes(oldPend)) throw new Error("pending buttons");
s = s.replace(oldPend, newPend);

const oldAcc = `                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditLink(r)}
                      >
                        Sửa phòng họp
                      </Button>`;
const newAcc = `                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        disabled={loading}
                        onClick={() => void acceptAndCreateRoom(r.id, true)}
                      >
                        <Video className="h-3.5 w-3.5" />
                        Tạo phòng họp mới
                      </Button>`;
if (!s.includes(oldAcc)) throw new Error("accepted buttons");
s = s.replace(oldAcc, newAcc);

fs.writeFileSync(p, s);
console.log("ok");
