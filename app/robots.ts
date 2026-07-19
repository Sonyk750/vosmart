import type { MetadataRoute } from "next"

// Crawlere AI permise explicit — pentru vizibilitate în ChatGPT, Claude, Perplexity, Google AI.
const aiCrawlers = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
]

const disallow = [
  "/api/",
  "/admin/",
  "/corporate/login/",
  "/corporate/dashboard/",
  "/corporate/checkout/",
  "/corporate/verify/",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiCrawlers.map(userAgent => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: "https://www.vosmart.ro/sitemap.xml",
    host: "https://www.vosmart.ro",
  }
}
