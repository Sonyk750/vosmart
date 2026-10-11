import type { Metadata } from "next"
import HomeClient from "./HomeClient"

const canonical = "https://www.vosmart.ro/"

// Pagina principală țintește „servicii de cenzorat”. „Firmă de cenzorat” stă pe /firma-de-cenzorat,
// „cenzorat asociații” pe /cenzorat-asociatii: când le purtau toate trei, Google le alterna (11.10.2026).
export const metadata: Metadata = {
  title: {
    absolute: "Servicii de Cenzorat pentru Asociații de Proprietari | VoSmart",
  },
  description:
    "Servicii de cenzorat pentru asociații de proprietari și blocuri: audit financiar-contabil, verificarea listelor de întreținere și rapoarte de cenzor online.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Servicii de Cenzorat pentru Asociații de Proprietari | VoSmart",
    description:
      "Cenzorat asociații și cenzorat blocuri cu audit financiar-contabil asistat de AI, rapoarte online și portal client 24/7.",
  },
}

export default function Home() {
  return <HomeClient />
}
