/**
 * Seed 5 khoa hoc mau day du: courses, course_benefits, course_chapters, course_lessons.
 * Can: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong .env.local
 *
 * Idempotent theo title: cap nhat course; xoa benefits/chapters/lessons cu roi tao lai.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEACHER_EMAIL = "teacher@example.com";

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* skip */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "[seed:advanced] Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

type LessonType = "video" | "text" | "quiz";

type SeedLesson = {
  title: string;
  type: LessonType;
  content: string;
  video_url?: string | null;
  time_estimate: number;
  is_free_preview?: boolean;
};

type SeedChapter = {
  title: string;
  description: string;
  lessons: SeedLesson[];
};

type SeedBenefit = {
  icon: string;
  title: string;
  description: string;
};

type SeedCourseDef = {
  title: string;
  description: string;
  course_type: "skill" | "role";
  category: string;
  categorySlug: string;
  level: "beginner" | "intermediate" | "advanced" | "all_levels";
  price: number;
  original_price?: number;
  duration_hours: number;
  rating: number;
  image_url: string;
  highlights: string[];
  outcomes_after: string[];
  what_you_will_learn: string[];
  benefits: SeedBenefit[];
  chapters: SeedChapter[];
};

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80";

const VID = {
  a: "https://youtu.be/rfscVS0vtbw",
  b: "https://youtu.be/kqtD5dpn9C8",
  c: "https://youtu.be/HXV3zeQKqGY",
  d: "https://youtu.be/7S_tz1z_5bA",
  e: "https://youtu.be/8DvywoWv6fI",
  f: "https://youtu.be/1Rs2ND1ryYc",
} as const;

function log(step: string, detail?: string) {
  const ts = new Date().toISOString();
  if (detail) console.log(`[${ts}] ${step} — ${detail}`);
  else console.log(`[${ts}] ${step}`);
}

async function findAuthUserIdByEmail(
  client: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn(
        "[seed:advanced] auth.admin.listUsers loi (bo qua tim email):",
        error.message
      );
      return null;
    }
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function resolveTeacherId(client: SupabaseClient): Promise<string> {
  log("Buoc 1", `Tim giao vien: uu tien email ${TEACHER_EMAIL}`);

  const authId = await findAuthUserIdByEmail(client, TEACHER_EMAIL);
  if (authId) {
    const { data: prof, error } = await client
      .from("profiles")
      .select("id")
      .eq("id", authId)
      .maybeSingle();
    if (error) throw error;
    if (prof?.id) {
      log("Buoc 1", `Dung profile khop email (id=${prof.id}).`);
      return prof.id;
    }
    log(
      "Buoc 1",
      "Co user auth nhung chua co dong profiles — chuyen sang admin dau tien."
    );
  } else {
    log("Buoc 1", "Khong tim thay user voi email mac dinh.");
  }

  const { data: admin, error: admErr } = await client
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (admErr) throw admErr;
  if (!admin?.id) {
    throw new Error(
      "Khong co profile admin. Tao tai khoan admin hoac user teacher@example.com + profile truoc."
    );
  }
  log("Buoc 1", `Dung admin dau tien (id=${admin.id}).`);
  return admin.id;
}

async function loadCategoryIds(
  client: SupabaseClient
): Promise<Record<string, string>> {
  const { data, error } = await client
    .from("course_categories")
    .select("id, slug");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.slug && row.id) map[row.slug] = row.id;
  }
  return map;
}

/** Noi dung tieng Viet day du, de doc, phu hop nguoi moi */
const COURSES: SeedCourseDef[] = [
  {
    title: "Lập trình C++ nâng cao",
    description:
      "Nang tam ky nang C++ hien dai: STL, RAII, smart pointer, toi uu bo nho va lap trinh da luong. Lo trinh sat thuc te thi dau va du an nho.",
    course_type: "skill",
    category: "Advanced Programming",
    categorySlug: "advanced-programming",
    level: "advanced",
    price: 699_000,
    original_price: 899_000,
    duration_hours: 30,
    rating: 4.85,
    image_url: PLACEHOLDER_IMG,
    highlights: [
      "Nen tang C++11/14/17 can dung hang ngay",
      "STL + iterator + lambda ung dung thuc te",
      "Quan ly bo nho an toan voi smart pointer",
      "Da luong co ban (thread, mutex, async)",
      "Bai lab mini: profiler va toi uu hot path",
      "Phu hop da biet C++ co ban, muon len trinh",
    ],
    outcomes_after: [
      "Doc va viet code C++ hien dai, tranh anti-pattern",
      "Chon cau truc STL phu hop cho bai toan",
      "Giam loi memory leak nho RAII va smart pointer",
      "Thiet ke module nho co hieu nang on dinh",
      "Tu tin tham gia ky thi lap trinh C++",
      "Co repo mau de khoe trong portfolio",
    ],
    what_you_will_learn: [
      "Modern C++ syntax va best practices",
      "Container, algorithm, functor trong STL",
      "Move semantics va R-value co ban",
      "Smart pointer: unique_ptr, shared_ptr, weak_ptr",
      "Concurrency co ban va data race",
      "Ky nang debug va benchmark don gian",
    ],
    benefits: [
      {
        icon: "award",
        title: "Chung chi hoan thanh",
        description:
          "Nhan chung chi PDF khi hoan thanh 100% bai bat buoc va bai kiem tra cuoi chuong.",
      },
      {
        icon: "trophy",
        title: "Thu thach va bang xep hang",
        description:
          "Bai lab cham tu dong; bang xep hang noi bo khuyen khich luyen tap deu dan.",
      },
      {
        icon: "calendar-clock",
        title: "Hoc linh hoat",
        description:
          "Xem lai video, doc bai viet sau, lam quiz moi luc — phu hop sinh vien va di lam.",
      },
      {
        icon: "gift",
        title: "Qua tang template",
        description:
          "Bo Makefile/CMake mau + snippet VS Code/Cursor de bat dau du an nhanh.",
      },
      {
        icon: "code-2",
        title: "Mentor review (async)",
        description:
          "Gui PR nho, nhan goi y cai thien style va performance.",
      },
    ],
    chapters: [
      {
        title: "C++ hien dai va STL cot loi",
        description:
          "On nhanh cu phap huu ich, namespace, auto, range-for, va pipeline STL.",
        lessons: [
          {
            title: "Modern C++ trong 20 phut",
            type: "video",
            content: "Video: tong quan C++11+ va thoi quen code sach.",
            video_url: VID.a,
            time_estimate: 20,
            is_free_preview: true,
          },
          {
            title: "Vector, map va thuat toan thuong gap",
            type: "text",
            content:
              "## Thuc hanh\n\n- Dung `std::vector` + `sort` + `lower_bound`.\n- So sanh `map` vs `unordered_map`.\n\n> Meo: luon du phong iterator invalidation khi xoa phan tu.",
            time_estimate: 35,
          },
          {
            title: "Kiem tra: STL co ban",
            type: "quiz",
            content:
              "Quiz gom 8 cau: do phuc tap thao tac, chon container hop ly, pitfall iterator.",
            time_estimate: 15,
          },
        ],
      },
      {
        title: "RAII, OOP va quan ly tai nguyen",
        description:
          "Constructor/destructor, rule of zero/three/five o muc ung dung.",
        lessons: [
          {
            title: "OOP: class gon gang",
            type: "video",
            content: "Video: thiet ke class nho, tranh God object.",
            video_url: VID.b,
            time_estimate: 25,
          },
          {
            title: "RAII va exception safety",
            type: "text",
            content:
              "## RAII\n\nTai nguyen gan voi vong doi object — mo file, dong socket tu dong.\n\n```cpp\nstd::ifstream f(\"data.txt\");\n// f tu dong khi ra scope\n```",
            time_estimate: 40,
          },
          {
            title: "Smart pointer thuc chien",
            type: "video",
            content: "Video: `unique_ptr`, `shared_ptr`, khi nao dung gi.",
            video_url: VID.c,
            time_estimate: 30,
          },
        ],
      },
      {
        title: "Hieu nang va debugging",
        description: "Do thoi gian, cache-friendly, va cong cu debug pho bien.",
        lessons: [
          {
            title: "Profiling nhanh voi sample tools",
            type: "text",
            content:
              "## Checklist\n\n1. Xac dinh hot path.\n2. Giam allocation trong vong lap.\n3. Thu `reserve()` cho vector.\n\nBai tap: giam 30% thoi gian mot ham sort + transform.",
            time_estimate: 45,
          },
          {
            title: "Move semantics — co ban la du",
            type: "video",
            content: "Video: rvalue, move constructor, NRVO intuition.",
            video_url: VID.d,
            time_estimate: 28,
          },
          {
            title: "Quiz: toi uu va bug hunt",
            type: "quiz",
            content:
              "Cho doan code cham + mot loi subtle — chon patch dung va giai thich.",
            time_estimate: 20,
          },
        ],
      },
      {
        title: "Da luong va du an tong ket",
        description: "Thread, mutex, packaged_task; hoan thien module nho da luong.",
        lessons: [
          {
            title: "Thread va mutex — pattern nho",
            type: "video",
            content: "Video: minh hoa race condition va mutex.",
            video_url: VID.e,
            time_estimate: 32,
          },
          {
            title: "Lab: thread pool don gian",
            type: "text",
            content:
              "## Yeu cau\n\n- Hang doi task co kich thuoc co dinh.\n- Worker thread an toan.\n- Shutdown gon gang.\n\nNoi link repo + screenshot ket qua benchmark.",
            time_estimate: 60,
          },
          {
            title: "Bai kiem tra cuoi khoa",
            type: "quiz",
            content:
              "Tong hop: STL, smart pointer, concurrency, hieu nang — 12 cau.",
            time_estimate: 25,
          },
        ],
      },
    ],
  },
  {
    title: "Lộ trình Python A-Z",
    description:
      "Tu nhap mon den xay script thuc te: cu phap, OOP, module, file, API nho va thoi quen lam viec chuyen nghiep. Phu hop nguoi moi nhung muon di xa.",
    course_type: "skill",
    category: "Basic Programming",
    categorySlug: "basic-programming",
    level: "all_levels",
    price: 999_000,
    original_price: 1_290_000,
    duration_hours: 40,
    rating: 4.92,
    image_url:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200&q=80",
    highlights: [
      "Lo trinh ro rang: nen tang → OOP → thuc hanh",
      "Bai tap ngan sau moi video",
      "Du an cuoi: CLI tool + goi API cong khai",
      "Notebook va script mau tai ve duoc",
      "Tips debug va doc stack trace than thien",
      "Cong dong hoc vien trao doi trong khoa",
    ],
    outcomes_after: [
      "Tu viet script Python doc/ghi file, xu ly CSV/JSON",
      "Hieu OOP du de doc package nho",
      "Biet tao moi truong ao va quan ly dependency co ban",
      "Goi REST API don gian voi `requests`",
      "Co thoi quen viet code co kiem thu tay va logging nhe",
      "San sang hoc framework web/data science buoc tiep theo",
    ],
    what_you_will_learn: [
      "Cu phap, kieu du lieu, ham, scope",
      "List, dict, comprehension",
      "OOP: class, inheritance, dunder methods co ban",
      "Module, package, pip, venv",
      "File I/O, encoding, pathlib",
      "HTTP API voi requests va xu ly loi",
    ],
    benefits: [
      {
        icon: "award",
        title: "Chung chi hoan thanh",
        description:
          "Xac nhan hoan thanh khi dat du bai va diem quiz toi thieu.",
      },
      {
        icon: "trophy",
        title: "Mini contest hang tuan",
        description: "De code ngan — luyen tu duy va toc do code.",
      },
      {
        icon: "calendar-clock",
        title: "Linh hoat 100% online",
        description: "Hoc theo tien do rieng, giu quyen truy cap tai lieu.",
      },
      {
        icon: "gift",
        title: "Bo cheat-sheet va snippet",
        description: "PDF tom tat + snippet VS Code cho Python thong dung.",
      },
      {
        icon: "users",
        title: "Nhom hoc ho tro",
        description:
          "QA async: dat cau hoi, mentor tong hop tra loi dinh ky.",
      },
      {
        icon: "sparkles",
        title: "Du an portfolio",
        description:
          "Mot repo GitHub chuan README de di phong van internship.",
      },
    ],
    chapters: [
      {
        title: "Lam quen Python va tu duy lap trinh",
        description: "Cai dat, chay script, debug nhe, va luong co ban.",
        lessons: [
          {
            title: "Python la gi — cai dat va Hello World",
            type: "video",
            content: "Video: cai Python, editor, chay file .py.",
            video_url: VID.a,
            time_estimate: 18,
            is_free_preview: true,
          },
          {
            title: "Bien, kieu du lieu, nhap xuat",
            type: "text",
            content:
              "## Bai doc\n\n- `int`, `float`, `str`, `bool`.\n- `input()` / `print()`.\n- Ep kieu an toan.\n\n**Bai tap:** chuyen doi nhiet do C/F.",
            time_estimate: 30,
          },
          {
            title: "Quiz: nen tang",
            type: "quiz",
            content: "8 cau ve kieu du lieu va toan tu.",
            time_estimate: 12,
          },
          {
            title: "Debug voi print va breakpoint",
            type: "video",
            content: "Video: doc traceback, dat breakpoint trong VS Code.",
            video_url: VID.f,
            time_estimate: 22,
          },
        ],
      },
      {
        title: "Luong dieu khien va cau truc du lieu",
        description: "if/for/while, list/dict/set, comprehension.",
        lessons: [
          {
            title: "Dieu kien va vong lap",
            type: "video",
            content: "Video: if/elif, for, while, break/continue.",
            video_url: VID.b,
            time_estimate: 24,
          },
          {
            title: "List va dict thuc chien",
            type: "text",
            content:
              "## Thuc hanh\n\n- Parse chuoi thanh list.\n\n```python\nnums = [int(x) for x in line.split()]\n```\n- Dem tan suat voi dict.",
            time_estimate: 40,
          },
          {
            title: "Quiz: comprehension",
            type: "quiz",
            content: "Viet comprehension dung output — 6 cau.",
            time_estimate: 15,
          },
          {
            title: "Lab: xu ly danh sach diem",
            type: "text",
            content:
              "Cho file text diem so — tinh GPA, top-k, histogram don gian.",
            time_estimate: 45,
          },
        ],
      },
      {
        title: "Ham, module va OOP",
        description: "To chuc code sach: function, package, class.",
        lessons: [
          {
            title: "Ham: tham so, return, scope",
            type: "video",
            content: "Video: *args, **kwargs khai niem co ban.",
            video_url: VID.c,
            time_estimate: 26,
          },
          {
            title: "Module va venv",
            type: "text",
            content:
              "## Cau truc\n\n```\nmytool/\n  __init__.py\n  core.py\n```\n\nDung `python -m venv .venv` va `pip install`.",
            time_estimate: 35,
          },
          {
            title: "OOP: class va dataclass nhe",
            type: "video",
            content: "Video: class, __init__, method, @dataclass intro.",
            video_url: VID.d,
            time_estimate: 30,
          },
          {
            title: "Quiz: thiet ke ham va class",
            type: "quiz",
            content: "Refactor doan code spaghetti thanh class ro rang.",
            time_estimate: 20,
          },
        ],
      },
      {
        title: "File, JSON va goi API",
        description: "Doc ghi file, xu ly JSON, requests co ban.",
        lessons: [
          {
            title: "Pathlib va doc/ghi file",
            type: "text",
            content:
              "## Vi du\n\n```python\nfrom pathlib import Path\ntext = Path('data.txt').read_text(encoding='utf-8')\n```",
            time_estimate: 32,
          },
          {
            title: "JSON va CSV nhanh",
            type: "video",
            content: "Video: `json.load`, `csv.DictReader`.",
            video_url: VID.e,
            time_estimate: 25,
          },
          {
            title: "HTTP voi requests",
            type: "text",
            content:
              "Goi API cong khai, xu ly status code, timeout, retry don gian.",
            time_estimate: 40,
          },
          {
            title: "Quiz: I/O va API",
            type: "quiz",
            content: "Chon doan code xu ly loi mang hop ly.",
            time_estimate: 18,
          },
        ],
      },
      {
        title: "Du an cuoi: CLI cong cu nho",
        description: "Gom kien thuc — tool dong lenh co subcommand.",
        lessons: [
          {
            title: "Thiet ke CLI: argparse",
            type: "video",
            content: "Video: subcommand, help text, exit code.",
            video_url: VID.f,
            time_estimate: 28,
          },
          {
            title: "Hoan thien du an va README",
            type: "text",
            content:
              "## Checklist\n\n- [ ] `README.md` huong dan cai dat\n- [ ] `requirements.txt`\n- [ ] Vi du chay\n- [ ] Test tay cac case bien",
            time_estimate: 50,
          },
          {
            title: "Noi bai va tu danh gia",
            type: "quiz",
            content:
              "Tu cham theo rubric: tinh nang, cau truc, tai lieu, xu ly loi.",
            time_estimate: 15,
          },
          {
            title: "Tong ket lo trinh A-Z",
            type: "text",
            content:
              "Buoc tiep theo: web (FastAPI/Django), data (pandas), automation.",
            time_estimate: 20,
          },
        ],
      },
    ],
  },
  {
    title: "SQL t\u1EEB c\u01A1 b\u1EA3n \u0111\u1EBFn n\u00E2ng cao",
    description:
      "Thanh thao truy van quan he: SELECT nang cao, JOIN, aggregation, subquery, index va transaction. Nen tang cho backend va phan tich du lieu.",
    course_type: "skill",
    category: "Basic Programming",
    categorySlug: "basic-programming",
    level: "intermediate",
    price: 799_000,
    original_price: 999_000,
    duration_hours: 25,
    rating: 4.78,
    image_url:
      "https://images.unsplash.com/photo-1544383835-bda542bc3a62?w=1200&q=80",
    highlights: [
      "Dataset mau thong nhat xuyen suot khoa",
      "Bai lab tren PostgreSQL-flavored SQL",
      "Giai thich ke hoach thuc thi (EXPLAIN) o muc intuition",
      "Case study bao cao doanh thu / cohort don gian",
      "Index va transaction cho production nho",
      "Quiz sat noi dung phong van junior data/backend",
    ],
    outcomes_after: [
      "Viet SELECT phuc tap co JOIN va GROUP BY dung ngu nghia",
      "Doc schema va uoc luong cardinality",
      "Tranh loi NULL trong aggregation",
      "Thiet ke index hop ly cho vai pattern truy van",
      "Hieu transaction va isolation o muc ung dung",
      "Tu tin lam bai test SQL thuc te",
    ],
    what_you_will_learn: [
      "SELECT, WHERE, ORDER BY, LIMIT",
      "JOIN nhieu chieu, self-join",
      "Aggregate, HAVING, window intro",
      "Subquery va CTE doc duoc",
      "Index, EXPLAIN co ban",
      "Transaction, constraint, migration mindset",
    ],
    benefits: [
      {
        icon: "award",
        title: "Chung chi SQL",
        description: "Hoan thanh chuoi lab + bai kiem tra tong hop.",
      },
      {
        icon: "trophy",
        title: "Dua top lab",
        description: "Bang xep hang thoi gian chay query toi uu (sandbox).",
      },
      {
        icon: "calendar-clock",
        title: "Hoc linh hoat",
        description: "Phu hop vua hoc vua lam.",
      },
      {
        icon: "gift",
        title: "Schema va dataset tai san",
        description: "File `.sql` seed + ER diagram PNG.",
      },
      {
        icon: "database",
        title: "Mentor Q&A",
        description:
          "Giai thich khac biet JOIN vs subquery, khi nao dung CTE.",
      },
    ],
    chapters: [
      {
        title: "Nen tang quan he va SELECT",
        description: "Bang, khoa, SELECT co ban.",
        lessons: [
          {
            title: "Mo hinh quan he trong 15 phut",
            type: "video",
            content: "Video: PK/FK, cardinality, NULL.",
            video_url: VID.a,
            time_estimate: 15,
            is_free_preview: true,
          },
          {
            title: "SELECT va loc du lieu",
            type: "text",
            content:
              "## Bai doc\n\n- `WHERE` voi `AND/OR`.\n- So sanh `=` vs `IS NULL`.\n- `ORDER BY`, `LIMIT`.",
            time_estimate: 35,
          },
          {
            title: "Quiz: SELECT",
            type: "quiz",
            content: "Viet query theo mo ta — 6 cau.",
            time_estimate: 20,
          },
        ],
      },
      {
        title: "JOIN va quan he nhieu bang",
        description: "INNER/LEFT, alias, dieu kien join.",
        lessons: [
          {
            title: "JOIN truc quan",
            type: "video",
            content: "Video: Venn diagram JOIN.",
            video_url: VID.b,
            time_estimate: 22,
          },
          {
            title: "Lab: don hang va khach hang",
            type: "text",
            content:
              "Cho `orders`, `customers`, `products` — bao cao doanh thu theo khach.",
            time_estimate: 45,
          },
          {
            title: "Quiz: JOIN",
            type: "quiz",
            content: "Chon JOIN dung de khong mat/trung dong.",
            time_estimate: 18,
          },
        ],
      },
      {
        title: "Aggregation va CTE",
        description: "GROUP BY, HAVING, CTE doc duoc.",
        lessons: [
          {
            title: "GROUP BY dung nghia",
            type: "video",
            content: "Video: pitfall SELECT * voi GROUP BY.",
            video_url: VID.c,
            time_estimate: 24,
          },
          {
            title: "CTE lam sach query",
            type: "text",
            content: "Refactor query dai thanh 3 CTE co ten ro rang.",
            time_estimate: 40,
          },
          {
            title: "Quiz: aggregation",
            type: "quiz",
            content: "Tinh retention don gian theo tuan.",
            time_estimate: 22,
          },
        ],
      },
      {
        title: "Index va hieu nang",
        description: "Index B-tree, EXPLAIN, vai pattern toi uu.",
        lessons: [
          {
            title: "Index la gi?",
            type: "text",
            content:
              "## Khai niem\n\n- Index giup tim theo cot nhanh hon.\n- Trade-off ghi/doc phu.\n\nThu `EXPLAIN` truoc va sau khi them index.",
            time_estimate: 38,
          },
          {
            title: "Video: case study query cham",
            type: "video",
            content: "Dieu tra sequential scan → index scan.",
            video_url: VID.d,
            time_estimate: 26,
          },
          {
            title: "Quiz: index",
            type: "quiz",
            content: "Chon cot nen index cho pattern WHERE + ORDER BY.",
            time_estimate: 16,
          },
        ],
      },
      {
        title: "Transaction va tong ket",
        description: "ACID intuition, isolation, bai test cuoi.",
        lessons: [
          {
            title: "Transaction co ban",
            type: "text",
            content:
              "```sql\nBEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nCOMMIT;\n```\n\nRollback khi loi.",
            time_estimate: 30,
          },
          {
            title: "Video: deadlock va timeout",
            type: "video",
            content: "Ngan gon ve deadlock va retry policy.",
            video_url: VID.e,
            time_estimate: 18,
          },
          {
            title: "Bai kiem tra cuoi khoa",
            type: "quiz",
            content: "10 cau tong hop + 1 cau tu luan.",
            time_estimate: 35,
          },
        ],
      },
    ],
  },
  {
    title: "Ho\u00E0n thi\u1EC7n \u1EE9ng d\u1EE5ng web v\u1EDBi C# v\u00E0 .NET Core",
    description:
      "Xay REST API voi ASP.NET Core, EF Core, validation, logging va trien khai toi thieu. Huong di thuc dung cho nguoi da biet lap trinh co ban.",
    course_type: "role",
    category: "Advanced Programming",
    categorySlug: "advanced-programming",
    level: "intermediate",
    price: 899_000,
    original_price: 1_150_000,
    duration_hours: 28,
    rating: 4.88,
    image_url:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80",
    highlights: [
      "Minimal API + layered architecture gon",
      "EF Core Code First voi migration mindset",
      "Validation, filter, middleware thuc te",
      "JWT auth o muc demo an toan hoc tap",
      "Dockerfile mau cho API nho",
      "Checklist release noi bo",
    ],
    outcomes_after: [
      "Tao project ASP.NET Core va chay debug on dinh",
      "Thiet ke entity + DbContext + repository don gian",
      "Viet endpoint CRUD co status code dung",
      "Ap dung validation va xu ly loi thong nhat",
      "Doc log va trace request co ban",
      "Dong goi image va chay local voi Docker",
    ],
    what_you_will_learn: [
      "C# nen tang cho backend: record, async/await",
      "Dependency injection trong ASP.NET Core",
      "EF Core: DbContext, migration, seed",
      "REST: resource, DTO, pagination co ban",
      "Auth JWT demo + refresh pattern tuong tu",
      "Testing tay voi Swagger/HTTP file",
    ],
    benefits: [
      {
        icon: "award",
        title: "Chung chi du an",
        description: "Hoan thanh API module + bao cao ngan.",
      },
      {
        icon: "trophy",
        title: "Hackathon noi bo",
        description: "Mo rong API trong 48h co goi y mentor.",
      },
      {
        icon: "calendar-clock",
        title: "Linh hoat",
        description: "Video + repo mau cap nhat theo .NET LTS.",
      },
      {
        icon: "gift",
        title: "Template solution",
        description: "Solution.zip: API + test HTTP + Dockerfile.",
      },
      {
        icon: "shield-check",
        title: "Best practice bao mat co ban",
        description: "Checklist: secret, CORS, rate limit khai niem.",
      },
      {
        icon: "book-open",
        title: "Tai lieu kien truc",
        description: "So do layer va luong request/response.",
      },
    ],
    chapters: [
      {
        title: "Chuan bi va tour ASP.NET Core",
        description: "SDK, template, run va debug.",
        lessons: [
          {
            title: "Cai .NET SDK va tao Web API",
            type: "video",
            content: "Video: `dotnet new webapi`, chay Swagger.",
            video_url: VID.a,
            time_estimate: 20,
            is_free_preview: true,
          },
          {
            title: "Kien truc project gon",
            type: "text",
            content:
              "## Goi y cau truc\n\n- `Api/`\n- `Application/`\n- `Domain/`\n- `Infrastructure/`",
            time_estimate: 30,
          },
          {
            title: "Quiz: HTTP va status code",
            type: "quiz",
            content: "Chon status code dung cho CRUD.",
            time_estimate: 15,
          },
        ],
      },
      {
        title: "Entity Framework Core",
        description: "Model, DbContext, migration.",
        lessons: [
          {
            title: "EF Core Code First",
            type: "video",
            content: "Video: entity `Product`, `DbSet`, migration.",
            video_url: VID.b,
            time_estimate: 28,
          },
          {
            title: "Quan he 1-n va seed data",
            type: "text",
            content: "`Category` — `Product`, seed trong `OnModelCreating`.",
            time_estimate: 42,
          },
          {
            title: "Quiz: EF",
            type: "quiz",
            content: "Tracking, SaveChanges, khi nao can `AsNoTracking`.",
            time_estimate: 18,
          },
        ],
      },
      {
        title: "REST API chuan",
        description: "Controller/Minimal, DTO, validation.",
        lessons: [
          {
            title: "CRUD Product",
            type: "video",
            content: "Video: GET list/detail, POST, PUT, DELETE.",
            video_url: VID.c,
            time_estimate: 32,
          },
          {
            title: "FluentValidation / built-in attributes",
            type: "text",
            content:
              "Thong nhat loi validation tra ve `ProblemDetails`.",
            time_estimate: 38,
          },
          {
            title: "Quiz: API design",
            type: "quiz",
            content: "Pagination, filter, sort — chon pattern hop ly.",
            time_estimate: 16,
          },
        ],
      },
      {
        title: "Auth JWT (demo) va middleware",
        description: "Bearer token, authorize, logging.",
        lessons: [
          {
            title: "JWT flow hoc tap",
            type: "text",
            content:
              "Canh bao: demo key trong dev; production dung secret manager.",
            time_estimate: 35,
          },
          {
            title: "Video: protect endpoint",
            type: "video",
            content: "`[Authorize]`, claim roles demo.",
            video_url: VID.d,
            time_estimate: 26,
          },
          {
            title: "Quiz: bao mat",
            type: "quiz",
            content: "Chon dap an dung ve refresh token va HTTPS.",
            time_estimate: 14,
          },
        ],
      },
      {
        title: "Docker va tong ket du an",
        description: "Dong goi, chay local, checklist.",
        lessons: [
          {
            title: "Dockerfile multi-stage nho",
            type: "video",
            content: "Build image API, chay `docker run`.",
            video_url: VID.e,
            time_estimate: 24,
          },
          {
            title: "Checklist truoc khi demo",
            type: "text",
            content:
              "- Health check\n- Versioning API\n- Log correlation id (optional)",
            time_estimate: 28,
          },
          {
            title: "Bai nop cuoi khoa",
            type: "quiz",
            content: "Rubric tu cham + 1 cau mo ve scale read-heavy.",
            time_estimate: 20,
          },
        ],
      },
      {
        title: "Mo rong va huong nghe nghiep",
        description: "SignalR, background job, tai nguyen hoc them.",
        lessons: [
          {
            title: "SignalR gioi thieu",
            type: "text",
            content: "Khi nao can real-time; vi du chat don gian.",
            time_estimate: 25,
          },
          {
            title: "Video: Hangfire / hosted service tuong tu",
            type: "video",
            content: "Background job cho email queue demo.",
            video_url: VID.f,
            time_estimate: 22,
          },
          {
            title: "Tong ket .NET backend",
            type: "quiz",
            content: "Lo trinh: clean architecture, testing, observability.",
            time_estimate: 12,
          },
        ],
      },
    ],
  },
  {
    title: "Lập trình sáng tạo với Scratch",
    description:
      "Hoc tu duy may tinh qua keo-tha: su kien, vong lap, dieu kien, clone sprite va lam game mini. Than thien tre em va nguoi moi hoan toan.",
    course_type: "skill",
    category: "Basic Programming",
    categorySlug: "basic-programming",
    level: "beginner",
    price: 399_000,
    original_price: 549_000,
    duration_hours: 20,
    rating: 4.95,
    image_url:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    highlights: [
      "Khong can go code — tap trung logic",
      "Du an game va cau chuyen tuong tac",
      "Huong dan tung buoc co hinh minh hoa",
      "Khoi goi sang tao am thanh, hinh anh",
      "Phu huynh co the dong hanh de dang",
      "Nen tang chuyen sang Python sau nay",
    ],
    outcomes_after: [
      "Hieu su kien (event) trong lap trinh",
      "Dung lap va dieu kien de dieu khien nhan vat",
      "Biet clone sprite va quan ly va cham don gian",
      "Hoan thanh 2 du an: maze va bat vat",
      "Biet chia se project Scratch online",
      "Tu tin hoc ngon ngu text-based tiep theo",
    ],
    what_you_will_learn: [
      "Giao dien Scratch: stage, sprite, khoi lenh",
      "Motion, Looks, Sound",
      "Control: loop, if, broadcast",
      "Sensing: va cham, khoang cach",
      "Variables va lists don gian",
      "Hoan thien game co diem so",
    ],
    benefits: [
      {
        icon: "award",
        title: "Giay khen hoan thanh",
        description: "Danh cho hoc sinh nho — PDF mau sac.",
      },
      {
        icon: "trophy",
        title: "Cuoc thi sang tao",
        description: "Gui project — binh chon cong dong trong khoa.",
      },
      {
        icon: "calendar-clock",
        title: "Hoc nhe nhang",
        description: "Moi buoi 25–40 phut, khong ap luc.",
      },
      {
        icon: "gift",
        title: "Asset mien phi",
        description: "Bo sprite va am thanh goi y.",
      },
      {
        icon: "heart",
        title: "Phu huynh dong hanh",
        description: "Huong dan phu huynh ho tro con dung cach.",
      },
    ],
    chapters: [
      {
        title: "Lam quen Scratch",
        description: "Tai khoan, stage, nhan vat dau tien.",
        lessons: [
          {
            title: "Tour Scratch Editor",
            type: "video",
            content: "Video: di chuyen meo Scratch bang phim mui ten.",
            video_url: VID.a,
            time_estimate: 15,
            is_free_preview: true,
          },
          {
            title: "Khoi Motion va Looks",
            type: "text",
            content:
              "## Thu ngay\n\n- Xoay huong\n- Doi costume\n- Noi mot cau trong 2 giay",
            time_estimate: 25,
          },
        ],
      },
      {
        title: "Lap va dieu kien",
        description: "forever, repeat, if then.",
        lessons: [
          {
            title: "Vong lap trong game",
            type: "video",
            content: "Video: nhay lien tuc tren mat dat.",
            video_url: VID.b,
            time_estimate: 18,
          },
          {
            title: "If — va cham tuong tac",
            type: "text",
            content:
              "Dung `touching color?` hoac `touching sprite?` de dung lai.",
            time_estimate: 30,
          },
        ],
      },
      {
        title: "Bien, diem va am thanh",
        description: "Score, hieu ung, lists nho.",
        lessons: [
          {
            title: "Bien diem so",
            type: "text",
            content: "Tao `score`, cong khi bat duoc vat the.",
            time_estimate: 28,
          },
          {
            title: "Am thanh va nhac nen",
            type: "video",
            content: "Them hieu ung va chinh am luong.",
            video_url: VID.c,
            time_estimate: 20,
          },
        ],
      },
      {
        title: "Clone va nhieu nhan vat",
        description: "Dan, nhieu ke dich.",
        lessons: [
          {
            title: "Clone sprite",
            type: "video",
            content: "Video: spawn dong xu roi ngau nhien.",
            video_url: VID.d,
            time_estimate: 22,
          },
          {
            title: "Lab: bat vat",
            type: "text",
            content: "Hoan thien game: diem, game over, restart.",
            time_estimate: 40,
          },
        ],
      },
      {
        title: "Du an cuoi va chia se",
        description: "Hoan thien maze hoac truyen tuong tac.",
        lessons: [
          {
            title: "Thiet ke maze",
            type: "text",
            content:
              "Ve backdrop, dat diem xuat phat/dich, thu nhieu loi di.",
            time_estimate: 35,
          },
          {
            title: "Chia se project",
            type: "video",
            content: "Dang len Scratch community, bat remix.",
            video_url: VID.e,
            time_estimate: 16,
          },
        ],
      },
    ],
  },
];

function countLessons(chapters: SeedChapter[]): number {
  return chapters.reduce((n, ch) => n + ch.lessons.length, 0);
}

function parseMissingColumnFromPgrst(message: string): string | null {
  const m = /Could not find the '([^']+)' column/.exec(message);
  return m?.[1] ?? null;
}

function fmtErr(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { code?: unknown; message?: unknown; details?: unknown };
    return JSON.stringify({
      code: o.code,
      message: o.message,
      details: o.details,
    });
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

/** PGRST205 = bang khong co trong schema cache (migration chua ap dung). */
async function tableExistsInCache(
  client: SupabaseClient,
  table: string
): Promise<boolean> {
  const { error } = await client.from(table).select("id").limit(1);
  if (!error) return true;
  if ((error as { code?: string }).code === "PGRST205") return false;
  throw error;
}

type SchemaFlags = {
  course_chapters: boolean;
  course_benefits: boolean;
  quizzes: boolean;
};

async function detectCourseSchema(client: SupabaseClient): Promise<SchemaFlags> {
  const course_chapters = await tableExistsInCache(client, "course_chapters");
  const course_benefits = await tableExistsInCache(client, "course_benefits");
  const quizzes = await tableExistsInCache(client, "quizzes");
  return { course_chapters, course_benefits, quizzes };
}

type McqQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

function buildMcqQuestionsForLesson(lesson: SeedLesson, salt: number): McqQuestion[] {
  const count = 5 + (salt % 6);
  const out: McqQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const correct = `Dap an dung (cau ${i + 1})`;
    out.push({
      question: `Trong bai "${lesson.title.slice(0, 85)}", cau ${i + 1}: chon phat bieu hop ly nhat.`,
      options: [
        correct,
        `Lua chon nhieu ${i}A`,
        `Lua chon nhieu ${i}B`,
        `Lua chon nhieu ${i}C`,
      ],
      correctAnswer: correct,
      explanation:
        "Giai thich: phuong an dung phan anh y chinh bai hoc; cac phuong an khac la hieu lam thu gap khi hoc nhanh.",
    });
  }
  return out;
}

async function upsertQuizForLesson(
  client: SupabaseClient,
  courseId: string,
  lessonId: string,
  lessonTitle: string,
  lesson: SeedLesson,
  teacherId: string,
  salt: number
) {
  const questions = buildMcqQuestionsForLesson(lesson, salt);
  const time_limit = Math.min(30, Math.max(10, 10 + (salt % 21)));
  const { error: delQ } = await client.from("quizzes").delete().eq("lesson_id", lessonId);
  if (delQ) throw delQ;
  const { error: insQ } = await client.from("quizzes").insert({
    title: `Quiz: ${lessonTitle}`,
    description: `Kiem tra kien thuc bai ${lessonTitle}`,
    course_id: courseId,
    lesson_id: lessonId,
    questions,
    time_limit,
    passing_score: 70,
    created_by: teacherId,
    is_published: true,
  });
  if (insQ) throw insQ;
  log("    QZ", `Quiz lesson=${lessonId} (${questions.length} cau, ${time_limit} phut)`);
}

/** PostgREST PGRST204: bo cot thieu (DB chua chay het migration) roi thu lai. */
async function upsertCourseRowAdaptive(
  client: SupabaseClient,
  courseId: string | null,
  payload: Record<string, unknown>
): Promise<string> {
  const maxAttempts = 16;
  let row: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (courseId) {
      const { error } = await client.from("courses").update(row).eq("id", courseId);
      if (!error) return courseId;
      if (error.code === "PGRST204") {
        const col = parseMissingColumnFromPgrst(error.message);
        if (col && col in row) {
          log("CANH BAO", `Schema thieu courses.${col} — bo khoi payload va thu lai.`);
          delete row[col];
          continue;
        }
      }
      throw error;
    }

    const { data, error } = await client.from("courses").insert(row).select("id").single();
    if (!error && data?.id) return data.id as string;
    if (error?.code === "PGRST204") {
      const col = parseMissingColumnFromPgrst(error.message);
      if (col && col in row) {
        log("CANH BAO", `Schema thieu courses.${col} — bo khoi payload va thu lai.`);
        delete row[col];
        continue;
      }
    }
    throw error;
  }

  throw new Error("upsertCourseRowAdaptive: het luot thu schema fallback");
}

async function upsertCourseStructure(
  client: SupabaseClient,
  teacherId: string,
  def: SeedCourseDef,
  categoryId: string | null,
  schema: SchemaFlags
) {
  const totalLessons = countLessons(def.chapters);
  log("Khoa hoc", `${def.title} (${totalLessons} bai hoc)`);

  const { data: existing, error: exErr } = await client
    .from("courses")
    .select("id")
    .eq("title", def.title)
    .maybeSingle();
  if (exErr) throw exErr;

  const baseRow = {
    description: def.description,
    content: def.description,
    course_type: def.course_type,
    category: def.category,
    category_id: categoryId,
    teacher_id: teacherId,
    status: "published" as const,
    is_published: true,
    ai_generated: false,
    price: def.price,
    original_price: def.original_price ?? null,
    duration_hours: def.duration_hours,
    total_lessons: totalLessons,
    rating: def.rating,
    level: def.level,
    what_you_will_learn: def.what_you_will_learn,
    highlights: def.highlights,
    outcomes_after: def.outcomes_after,
    image_url: def.image_url,
    thumbnail_url: def.image_url,
    source_file: null,
    requirements: [
      "May tinh ket noi Internet on dinh",
      "Tai khoan email de nhan tai lieu",
    ],
    target_audience:
      def.level === "beginner"
        ? "Nguoi moi bat dau, hoc sinh THCS tro len"
        : def.level === "advanced"
          ? "Da co nen tang, muon nang cao"
          : "Nguoi da biet lap trinh co ban hoac tu hoc co huong dan",
  };

  const payload: Record<string, unknown> = { ...baseRow, title: def.title };

  let courseId: string;
  if (existing?.id) {
    courseId = existing.id;
    log(
      "  >>",
      `Da co course id=${courseId}, cap nhat metadata va lam moi cau truc con.`
    );
    courseId = await upsertCourseRowAdaptive(client, courseId, payload);
  } else {
    log("  >>", "Tao course moi...");
    courseId = await upsertCourseRowAdaptive(client, null, payload);
    log("  >>", `Da tao course moi id=${courseId}`);
  }

  const { error: delL } = await client
    .from("course_lessons")
    .delete()
    .eq("course_id", courseId);
  if (delL) throw delL;
  log("  >>", "Da xoa course_lessons cu (neu co).");

  if (schema.course_chapters) {
    const { error: delCh } = await client
      .from("course_chapters")
      .delete()
      .eq("course_id", courseId);
    if (delCh) throw delCh;
    log("  >>", "Da xoa course_chapters cu (neu co).");
  } else {
    log("  >>", "Bo qua course_chapters (bang khong co tren DB — chen lessons phang).");
  }

  if (schema.course_benefits) {
    const { error: delB } = await client
      .from("course_benefits")
      .delete()
      .eq("course_id", courseId);
    if (delB) throw delB;
    log("  >>", "Da xoa course_benefits cu (neu co).");

    const benefitRows = def.benefits.map((b, i) => ({
      course_id: courseId,
      icon: b.icon,
      title: b.title,
      description: b.description,
      display_order: i,
    }));
    const { error: benErr } = await client.from("course_benefits").insert(benefitRows);
    if (benErr) throw benErr;
    log("  >>", `Da chen ${benefitRows.length} benefits.`);
  } else {
    log("  >>", "Bo qua course_benefits (bang khong co tren DB).");
  }

  let quizSalt = 0;

  async function insertLessonsWithQuizzes(
    sourceLessons: SeedLesson[],
    lessonRows: Record<string, unknown>[]
  ) {
    let rows: Record<string, unknown>[] = lessonRows.map((r) => ({ ...r }));
    for (let a = 0; a < 12; a++) {
      const { data, error: lErr } = await client
        .from("course_lessons")
        .insert(rows)
        .select("id, title");
      if (!lErr && data) {
        log("    **", `Da chen ${data.length} lessons.`);
        if (schema.quizzes) {
          if (data.length !== sourceLessons.length) {
            log(
              "CANH BAO",
              "Bo qua quiz: so ban ghi insert khac so bai trong seed."
            );
          } else {
            for (let i = 0; i < data.length; i++) {
              await upsertQuizForLesson(
                client,
                courseId,
                data[i].id as string,
                data[i].title as string,
                sourceLessons[i],
                teacherId,
                quizSalt++
              );
            }
          }
        }
        return;
      }
      if (lErr?.code === "PGRST204") {
        const col = parseMissingColumnFromPgrst(lErr.message);
        if (col) {
          log("CANH BAO", `Schema thieu course_lessons.${col} — bo cot khoi batch.`);
          rows = rows.map((r) => {
            const x = { ...r };
            delete x[col];
            return x;
          });
          continue;
        }
      }
      throw lErr;
    }
    throw new Error("course_lessons: khong chen duoc sau khi strip cot (qua 12 lan).");
  }

  let orderIndex = 0;

  if (schema.course_chapters) {
    for (let ci = 0; ci < def.chapters.length; ci++) {
      const ch = def.chapters[ci];
      const { data: chRow, error: chInsErr } = await client
        .from("course_chapters")
        .insert({
          course_id: courseId,
          title: ch.title,
          description: ch.description,
          order_index: ci,
        })
        .select("id")
        .single();
      if (chInsErr) throw chInsErr;
      const chapterId = chRow.id as string;
      log("  >>", `Chapter ${ci + 1}: ${ch.title} (id=${chapterId})`);

      const lessonRows = ch.lessons.map((les) => ({
        course_id: courseId,
        chapter_id: chapterId,
        title: les.title,
        content: les.content,
        type: les.type,
        video_url: les.type === "video" ? (les.video_url ?? null) : null,
        time_estimate: les.time_estimate,
        order_index: orderIndex++,
        status: "published" as const,
        created_by: teacherId,
        is_required: true,
        is_free_preview: les.is_free_preview ?? false,
      }));

      await insertLessonsWithQuizzes(ch.lessons, lessonRows);
    }
  } else {
    log("  >>", "Chen tat ca lessons theo thu tu chuong (khong chapter_id).");
    const flat: SeedLesson[] = def.chapters.flatMap((c) => c.lessons);
    const lessonRows = flat.map((les) => ({
      course_id: courseId,
      title: les.title,
      content: les.content,
      type: les.type,
      video_url: les.type === "video" ? (les.video_url ?? null) : null,
      time_estimate: les.time_estimate,
      order_index: orderIndex++,
      status: "published" as const,
      created_by: teacherId,
      is_required: true,
      is_free_preview: les.is_free_preview ?? false,
    }));
    await insertLessonsWithQuizzes(flat, lessonRows);
  }

  const { error: syncErr } = await client.rpc("set_course_total_lessons", {
    p_course_id: courseId,
  });
  if (syncErr) {
    log(
      "  !!",
      `Khong goi RPC set_course_total_lessons (co the chua deploy): ${syncErr.message}`
    );
  } else {
    log("  >>", "Da dong bo total_lessons qua RPC.");
  }
}

async function main() {
  log("=== Bat dau seed:advanced ===", "");

  const teacherId = await resolveTeacherId(supabase);
  const catMap = await loadCategoryIds(supabase);
  log("Buoc 2", `Da load ${Object.keys(catMap).length} course_categories.`);
  const schema = await detectCourseSchema(supabase);
  log(
    "Buoc 2b",
    `Bang tuy chon: course_chapters=${schema.course_chapters}, course_benefits=${schema.course_benefits}, quizzes=${schema.quizzes}`
  );

  for (const def of COURSES) {
    const cid = catMap[def.categorySlug] ?? null;
    if (!cid) {
      log(
        "CANH BAO",
        `Khong tim slug '${def.categorySlug}' — category_id de null (chi dung cot category text).`
      );
    }
    try {
      await upsertCourseStructure(supabase, teacherId, def, cid, schema);
    } catch (e) {
      console.error(`[seed:advanced] Loi khi xu ly "${def.title}":`, fmtErr(e));
      throw e;
    }
  }

  log("=== Hoan tat seed:advanced ===", `${COURSES.length} khoa hoc.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[seed:advanced] That bai:", fmtErr(e));
    process.exit(1);
  });
