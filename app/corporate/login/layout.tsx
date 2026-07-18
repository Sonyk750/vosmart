import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Autentificare corporate",
  alternates: { canonical: "/corporate/login" },
  robots: { index: false, follow: false, nocache: true },
}

export default function CorporateLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
