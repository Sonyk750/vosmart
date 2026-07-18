import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUpdatedAt = new Date("2026-07-18")
  const posts = getAllPosts()
  const blogUrls = posts.map(post => ({
    url: `https://www.vosmart.ro/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [
    { url: "https://www.vosmart.ro", lastModified: siteUpdatedAt, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.vosmart.ro/cenzorat-asociatii", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/platforma-ai-cenzorat", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/blog", lastModified: siteUpdatedAt, changeFrequency: "weekly", priority: 0.8 },
    { url: "https://www.vosmart.ro/corporate", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.vosmart.ro/help", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.6 },
    ...blogUrls,
  ]
}
