import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog despre cenzorat, legislație și digitalizare",
  description: "Ghiduri despre cenzoratul asociațiilor de proprietari, verificări financiar-contabile, legislație, rapoarte și analiză asistată de AI.",
  alternates: { canonical: "https://www.vosmart.ro/blog" },
}

const categoryBg: Record<string, string> = {
  "Cenzorat": "bg-emerald-500/15",
  "Administrare Imobile": "bg-cyan-500/15",
  "Facturare": "bg-violet-500/15",
}
const categoryText: Record<string, string> = {
  "Cenzorat": "text-emerald-300",
  "Administrare Imobile": "text-cyan-300",
  "Facturare": "text-violet-300",
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen text-white" style={{ background: "#030b0f" }}>
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.12), transparent 60%)" }} />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 backdrop-blur-md"
        style={{ background: "rgba(3,11,15,0.85)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight"
            style={{ background: "linear-gradient(90deg,#6ee7b7,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VoSmart
          </Link>
          <Link href="/" className="text-sm text-slate-400 transition hover:text-white">← Înapoi</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-emerald-400">Blog VoSmart</p>
          <h1 className="text-4xl font-bold sm:text-5xl mb-4">Resurse pentru cenzorat modern</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">Ghiduri practice despre cenzoratul asociațiilor de proprietari, verificări financiar-contabile, legislație și analiză asistată de AI.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.06]">
              <div className="mb-4 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryBg[post.category] ?? "bg-white/8"} ${categoryText[post.category] ?? "text-white"}`}>
                  {post.category}
                </span>
                <span className="text-xs text-slate-500">{post.readTime} citire</span>
              </div>
              <h2 className="mb-3 text-lg font-semibold leading-snug text-white group-hover:text-emerald-300 transition">
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 line-clamp-3">{post.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  {new Date(post.date).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="text-sm text-emerald-400 group-hover:text-emerald-300 transition">Citește →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-semibold text-emerald-400">VoSmart</span>
          <div className="flex gap-6">
            <Link href="https://www.spokinvoice.ro" className="hover:text-white transition">SpokInvoice</Link>
            <Link href="https://spokapp.ro/spokadmin" className="hover:text-white transition">SpokAdmin</Link>
            <Link href="https://spokapp.ro" className="hover:text-white transition">SpokApp</Link>
          </div>
          <span>© 2026 VoSmart</span>
        </div>
      </footer>
    </div>
  )
}
