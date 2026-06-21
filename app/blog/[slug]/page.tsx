import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllPosts, getPost } from "@/lib/blog"

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://www.vosmart.ro/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.vosmart.ro/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
    },
  }
}

const categoryColors: Record<string, string> = {
  "Cenzorat": "#6ee7b7",
  "Administrare Imobile": "#67e8f9",
  "Facturare": "#a78bfa",
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen text-white" style={{ background: "#030b0f" }}>
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.1), transparent 60%)" }} />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 backdrop-blur-md"
        style={{ background: "rgba(3,11,15,0.85)" }}>
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight"
            style={{ background: "linear-gradient(90deg,#6ee7b7,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VoSmart
          </Link>
          <Link href="/blog" className="text-sm text-slate-400 transition hover:text-white">← Blog</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: `${categoryColors[post.category]}20`, color: categoryColors[post.category] ?? "#fff" }}>
              {post.category}
            </span>
            <span className="text-xs text-slate-500">{post.readTime} citire</span>
            <span className="text-xs text-slate-600">
              {new Date(post.date).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl mb-4">{post.title}</h1>
          <p className="text-slate-400 text-lg leading-relaxed">{post.description}</p>
        </div>

        <div className="h-px w-full mb-10" style={{ background: "rgba(255,255,255,0.08)" }} />

        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="mt-16 rounded-2xl border border-emerald-400/20 p-6 text-center"
          style={{ background: "rgba(16,185,129,0.06)" }}>
          <h3 className="text-xl font-bold mb-2">Încearcă VoSmart gratuit</h3>
          <p className="text-slate-400 text-sm mb-4">Cenzorat inteligent cu AI — rapoarte automate, detecție anomalii, portal proprietari.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="https://www.vosmart.ro/corporate"
              className="inline-flex rounded-xl px-6 py-3 text-sm font-semibold transition"
              style={{ background: "rgba(52,211,153,0.9)", color: "#000" }}>
              Începe gratuit →
            </Link>
            <Link href="https://spokapp.ro"
              className="inline-flex rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold transition hover:border-white/20"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              Descoperă SpokApp
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-semibold" style={{ color: "#6ee7b7" }}>VoSmart</span>
          <div className="flex gap-6">
            <Link href="/blog" className="hover:text-white transition">Blog</Link>
            <Link href="https://spokapp.ro/spokadmin" className="hover:text-white transition">SpokAdmin</Link>
            <Link href="https://spokapp.ro/spokinvoice" className="hover:text-white transition">SpokInvoice</Link>
            <Link href="/#contact" className="hover:text-white transition">Contact</Link>
          </div>
          <span>© 2026 VoSmart</span>
        </div>
      </footer>
    </div>
  )
}
