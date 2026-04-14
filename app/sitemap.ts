import { getSiteUrl } from "@/lib/seo/site-url";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const paths = [
    "",
    "/login",
    "/signup",
    "/quizzes",
    "/assessment",
  ];

  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
