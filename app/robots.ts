import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/corporate/login/",
          "/corporate/dashboard/",
          "/corporate/checkout/",
          "/corporate/verify/",
        ],
      },
    ],
    sitemap: "https://www.vosmart.ro/sitemap.xml",
  }
}
