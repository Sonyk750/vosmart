import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"

export default function sitemap(): MetadataRoute.Sitemap {
  // De bumpat manual la fiecare revizuire a paginilor statice — altfel crawlerul
  // vede o dată veche exact pe paginile care s-au schimbat.
  // 2026-08-04: titluri și meta descriptions rescrise, conținut nou pe /corporate și /help.
  const siteUpdatedAt = new Date("2026-08-04")
  const posts = getAllPosts()
  const blogUrls = posts.map(post => ({
    url: `https://www.vosmart.ro/blog/${post.slug}`,
    // `dateModified` reflectă ultima actualizare a articolului; fără el, o
    // revizuire de conținut nu ar semnala nimic crawlerelor.
    lastModified: new Date(post.dateModified || post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
  // Indexul de blog se împrospătează singur la fiecare articol nou sau revizuit.
  const blogIndexUpdatedAt = blogUrls.reduce(
    (latest, entry) => (entry.lastModified > latest ? entry.lastModified : latest),
    siteUpdatedAt,
  )

  return [
    { url: "https://www.vosmart.ro", lastModified: siteUpdatedAt, changeFrequency: "weekly", priority: 1 },
    { url: "https://www.vosmart.ro/firma-de-cenzorat", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/cenzorat-asociatii", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/cenzorat-blocuri", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/audit-financiar-contabil", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/platforma-ai-cenzorat", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.vosmart.ro/blog", lastModified: blogIndexUpdatedAt, changeFrequency: "weekly", priority: 0.8 },
    { url: "https://www.vosmart.ro/corporate", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.vosmart.ro/help", lastModified: siteUpdatedAt, changeFrequency: "monthly", priority: 0.6 },
    ...blogUrls,
  ]
}
