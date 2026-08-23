import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `sharp` are binare native (libvips). Trecut prin bundler ar fi rescris in
  // JavaScript si si-ar pierde legatura cu ele; lasat extern, e cerut la rulare
  // asa cum e instalat. Il folosim la recodarea scanarilor — vezi
  // `lib/cenzorat/optimizare.ts`.
  serverExternalPackages: ["sharp"],

  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }]
  },
};

export default nextConfig;
