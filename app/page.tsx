import { LandingHeader } from "@/components/landing/landing-header";
import { BookOpen, Brain, Code2, Users, Mail, MapPin } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Brain,
    title: "30 câu đánh giá + MBTI",
    desc: "Hệ thống phân tích phong cách học, mục tiêu và tính cách để gợi ý lộ trình chính xác nhất.",
  },
  {
    icon: BookOpen,
    title: "Khóa học đa dạng",
    desc: "C++, Java, SQL, Python, Frontend, Backend, Fullstack — do giáo viên thật biên soạn.",
  },
  {
    icon: Code2,
    title: "Phòng luyện code thông minh",
    desc: "Monaco Editor, chạy code online, AI gợi ý sửa lỗi — như LeetCode phiên bản Việt.",
  },
  {
    icon: Users,
    title: "Kết nối giáo viên",
    desc: "Gửi yêu cầu, nhận phản hồi nhanh — học 1:1 không cần ra khỏi nền tảng.",
  },
];

const teachers = [
  { name: "Nguyễn Văn A", subject: "Python & Data Science", avatar: "NV" },
  { name: "Trần Thị B", subject: "Frontend & React", avatar: "TT" },
  { name: "Lê Hoàng C", subject: "C++ & Thuật toán", avatar: "LH" },
  { name: "Phạm Minh D", subject: "Backend & SQL", avatar: "PM" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-50 to-blue-50 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Học lập trình cùng{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              EduAI
            </span>
            <br />
            Vào code là mượt
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
            Lộ trình cá nhân hóa, phòng luyện code thông minh, kết nối giáo viên
            dễ dàng. Bắt đầu hành trình lập trình của bạn ngay hôm nay.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-neutral-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-neutral-800 hover:shadow-xl"
            >
              Đăng ký ngay
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-neutral-300 bg-white px-8 py-3.5 text-base font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-0 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
      </section>

      {/* Roadmap / Features */}
      <section id="roadmap" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Lộ trình có độ chính xác cao
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
              30 câu hỏi đánh giá + MBTI — phân tích chính xác phong cách học,
              gợi ý khóa học phù hợp mục tiêu và thời gian của bạn.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers */}
      <section id="teachers" className="bg-neutral-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Đội ngũ giáo viên
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
              Giàu kinh nghiệm, sẵn sàng hướng dẫn và phản hồi yêu cầu kết nối
              của bạn.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((t) => (
              <div
                key={t.name}
                className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-bold text-white">
                  {t.avatar}
                </div>
                <h3 className="mt-4 text-base font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{t.subject}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="border-t border-neutral-200 bg-white px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">EduAI</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Nền tảng học lập trình thông minh cho học sinh Việt Nam.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Liên hệ tư vấn</h4>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                kmares.team@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-400" />
                Việt Nam
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Truy cập nhanh</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-neutral-600 hover:text-neutral-900">
                  Đăng ký
                </Link>
              </li>
              <li>
                <Link href="/student" className="text-neutral-600 hover:text-neutral-900">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400">
          © 2025 EduAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
