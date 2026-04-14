import type { Metadata } from "next";
import { getMetadataBase } from "@/lib/seo/site-url";

const OG_IMAGE = "/images/logo.png";

const baseDescription =
  "Nền tảng học lập trình với AI, lộ trình cá nhân hóa, phòng luyện code thông minh và kết nối giáo viên.";

export const defaultOpenGraph = {
  siteName: "EduAI",
  locale: "vi_VN",
  type: "website" as const,
  images: [
    {
      url: OG_IMAGE,
      width: 512,
      height: 512,
      alt: "EduAI",
    },
  ],
};

export const defaultTwitter = {
  card: "summary_large_image" as const,
  title: "EduAI",
  description: baseDescription,
  images: [OG_IMAGE],
};

/** Metadata gốc (root layout + tái sử dụng). */
export function buildRootMetadata(): Metadata {
  return {
    metadataBase: getMetadataBase(),
    title: {
      default: "EduAI — Học lập trình cá nhân hóa",
      template: "%s | EduAI",
    },
    description: baseDescription,
    keywords: [
      "EduAI",
      "học lập trình",
      "lộ trình",
      "AI",
      "luyện code",
      "Python",
      "Java",
    ],
    openGraph: {
      ...defaultOpenGraph,
      title: "EduAI — Học lập trình cá nhân hóa",
      description: baseDescription,
    },
    twitter: defaultTwitter,
    alternates: {
      canonical: "/",
    },
  };
}

export function segmentMetadata(args: {
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title: args.title,
    description: args.description,
    robots: args.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
    openGraph: {
      ...defaultOpenGraph,
      title: `${args.title} | EduAI`,
      description: args.description,
    },
    twitter: {
      ...defaultTwitter,
      title: `${args.title} | EduAI`,
      description: args.description,
    },
  };
}
