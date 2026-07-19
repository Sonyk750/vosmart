import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoSmart — Cenzorat asociații de proprietari",
    short_name: "VoSmart",
    description:
      "Firmă de cenzorat pentru asociații de proprietari, cu analiză asistată de AI și rapoarte online.",
    start_url: "/",
    display: "standalone",
    background_color: "#050814",
    theme_color: "#050814",
    lang: "ro",
    icons: [
      { src: "/logo-vosmart.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
