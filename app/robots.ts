import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/corporate/dashboard/"],
      },
    ],
    sitemap: "https://www.vosmart.ro/sitemap.xml",
  }
}
