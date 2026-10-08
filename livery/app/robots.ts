import type { MetadataRoute } from "next";
import { SITE } from "@/constants/constants";

// Search engines and AI answer engines are welcome everywhere public; the
// private and machine-only areas stay closed to all of them.
const PRIVATE = ["/api/", "/build", "/design", "/admin", "/me", "/auth", "/update-password", "/sign-in", "/sign-up", "/forgot-password", "/extension/connect"];

// AI search and answer crawlers, named so it's clear they're invited to read
// (and cite) Livery's pages and kits.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
