import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ajutor platformă și servicii de cenzorat",
  description:
    "Ghid VoSmart pentru conturi, documente, analiza asistată de AI, rapoarte de cenzorat, abonamente și protecția datelor.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Ajutor platformă și servicii de cenzorat | VoSmart",
    description:
      "Răspunsuri și ghiduri despre platforma VoSmart, analiza asistată de AI și serviciile de cenzorat.",
    url: "/help",
  },
}

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
