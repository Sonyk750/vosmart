import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoSmart - Firmă de Cenzorat pentru Asociații de Proprietari",

  description:
    "VoSmart oferă servicii profesionale de cenzorat asociații de proprietari, cenzorat blocuri, verificări financiare și rapoarte online.",

  keywords: [
    "firma de cenzorat",
    "cenzorat asociatii",
    "cenzorat blocuri",
    "cenzorat asociatii de proprietari",
    "cenzor asociatie proprietari",
    "servicii cenzorat",
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
      <body className="min-h-full flex flex-col bg-[#050814] text-white">
        {children}
      </body>
    </html>
  );
}