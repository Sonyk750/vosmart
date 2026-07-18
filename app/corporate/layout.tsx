import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Platformă corporate pentru firme de cenzorat",
  description:
    "VoSmart ajută firmele de cenzorat să gestioneze dosare, verificări și rapoarte pentru asociații de proprietari într-un portal digital securizat.",
  alternates: { canonical: "/corporate" },
  openGraph: {
    title: "Platformă corporate pentru firme de cenzorat | VoSmart",
    description:
      "Portal digital pentru firme de cenzorat: dosare, verificări, rapoarte și colaborare securizată.",
    url: "/corporate",
  },
}

export default function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
