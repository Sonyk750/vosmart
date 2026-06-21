import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  const blogUrls = posts.map(post => ({
    url: `https://www.vosmart.ro/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [
    { url: "https://www.vosmart.ro", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://www.vosmart.ro/blog", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: "https://www.vosmart.ro/clienti", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.vosmart.ro/corporate", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.vosmart.ro/help", lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ...blogUrls,
  ]
}
