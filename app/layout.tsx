import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/app/components/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050814",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vosmart.ro"),
  title: {
    default: "VoSmart — Firmă de Cenzorat pentru Asociații de Proprietari",
    template: "%s | VoSmart",
  },
  description:
    "Servicii de cenzorat pentru asociații de proprietari din București, cu analiză asistată de AI, rapoarte online și verificări financiare clare.",
  keywords: [
    "firma de cenzorat",
    "cenzorat asociatii proprietari",
    "cenzorat blocuri",
    "cenzor asociatie proprietari",
    "servicii cenzorat bucuresti",
    "cenzorat asociatii de proprietari",
    "rapoarte cenzor online",
    "firma cenzorat bucuresti",
    "cenzorat imobile",
    "verificare financiara asociatie",
    "cenzor profesionist",
    "portal cenzor online",
    "vosmart",
    "Legea 196 2018 asociatii",
    "raport cenzor asociatie",
  ],
  authors: [{ name: "VoSmart", url: "https://www.vosmart.ro" }],
  creator: "VoSmart",
  publisher: "VoSmart",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.vosmart.ro",
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: "https://www.vosmart.ro",
    siteName: "VoSmart",
    title: "VoSmart — Firmă de Cenzorat pentru Asociații de Proprietari",
    description:
      "Servicii profesionale de cenzorat asociații de proprietari cu rapoarte online, portal client 24/7 și verificări conforme legii.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "VoSmart — Cenzorat Asociații Proprietari",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VoSmart — Firmă de Cenzorat Asociații Proprietari",
    description: "Cenzorat profesional cu rapoarte online și portal client 24/7.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-vosmart.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness"],
      "@id": "https://www.vosmart.ro/#organization",
      name: "VoSmart",
      url: "https://www.vosmart.ro",
      telephone: "+40756362828",
      email: "office@vosmart.ro",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Str. Constantin Dobrogeanu Gherea 89",
        addressLocality: "București",
        postalCode: "013711",
        addressCountry: "RO",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
      description:
        "Firmă de cenzorat pentru asociații de proprietari din București. Rapoarte lunare online, portal client și verificări financiare conforme Legii 196/2018.",
    },
    {
      "@type": "WebSite",
      "@id": "https://www.vosmart.ro/#website",
      url: "https://www.vosmart.ro",
      name: "VoSmart",
      publisher: { "@id": "https://www.vosmart.ro/#organization" },
      inLanguage: "ro-RO",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script defer src="https://monitor.spokadmin.ro/t.js" data-site="vosmart" />
      </head>
      <body className="min-h-full flex flex-col bg-[#050814] text-white">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
