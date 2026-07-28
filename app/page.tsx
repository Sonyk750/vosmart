import type { Metadata } from "next"
import HomeClient from "./HomeClient"

const canonical = "https://www.vosmart.ro/"

export const metadata: Metadata = {
  title: {
    absolute: "Firmă de Cenzorat Asociații de Proprietari | VoSmart",
  },
  description:
    "Firmă de cenzorat pentru asociații de proprietari și blocuri: audit financiar-contabil, verificarea listelor de întreținere și rapoarte de cenzor online, conform Legii 196/2018.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Firmă de Cenzorat Asociații de Proprietari | VoSmart",
    description:
      "Cenzorat asociații și cenzorat blocuri cu audit financiar-contabil asistat de AI, rapoarte online și portal client 24/7.",
  },
}

export default function Home() {
  return <HomeClient />
}
