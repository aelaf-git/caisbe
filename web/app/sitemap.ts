import type { MetadataRoute } from "next";
import { courseProgramPath, fetchPublishedCourses, fetchPublishedNews } from "@/lib/api";
import { siteOrigin } from "@/lib/site";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/professional-development",
  "/membership",
  "/events",
  "/news",
  "/resources",
  "/careers",
  "/contact",
  "/partners",
  "/faq",
  "/help",
];

function entry(origin: string, path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const pages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => entry(origin, path));

  try {
    const courses = await fetchPublishedCourses();
    for (const course of courses) {
      if (!course.slug) continue;
      pages.push({
        url: `${origin}${courseProgramPath(course.slug)}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // The public list still ships when the course API is unavailable.
  }

  try {
    const posts = await fetchPublishedNews();
    for (const post of posts) {
      if (!post.slug) continue;
      pages.push({
        url: `${origin}/news/${encodeURIComponent(post.slug)}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // The public list still ships when the news API is unavailable.
  }

  return pages;
}
