import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

const AI_AND_SCRAPER_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Bytespider",
  "Omgilibot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Diffbot",
  "Scrapy",
  "Applebot-Extended",
  "PerplexityBot",
  "Cohere-ai",
  "YouBot",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/my-account", "/api"],
      },
      {
        userAgent: AI_AND_SCRAPER_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
