import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllPosts, getPost, getRelatedPosts } from "@/lib/blog"

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
    authors: [{ name: "VoSmart", url: "https://www.vosmart.ro" }],
    alternates: { canonical: `https://www.vosmart.ro/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.vosmart.ro/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.dateModified || post.date,
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

  const related = getRelatedPosts(slug, 3)
  const url = `https://www.vosmart.ro/blog/${slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        image: "https://www.vosmart.ro/opengraph-image.png",
        datePublished: post.date,
        dateModified: post.dateModified || post.date,
        inLanguage: "ro-RO",
        articleSection: post.category,
        keywords: post.keywords?.join(", "),
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@id": "https://www.vosmart.ro/#organization" },
        publisher: { "@id": "https://www.vosmart.ro/#organization" },
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "VoSmart", item: "https://www.vosmart.ro/" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.vosmart.ro/blog" },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
      ...(post.faqs.length
        ? [{
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            mainEntity: post.faqs.map(f => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }]
        : []),
    ],
  }

  return (
    <div className="min-h-screen text-white" style={{ background: "#030b0f" }}>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="transition hover:text-slate-300">VoSmart</Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="transition hover:text-slate-300">Blog</Link>
          <span aria-hidden>/</span>
          <span className="text-slate-400 line-clamp-1">{post.title}</span>
        </nav>
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

        {related.length > 0 && (
          <section aria-label="Articole similare" className="mt-16">
            <h2 className="mb-5 text-lg font-semibold text-white">Articole similare</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map(item => (
                <Link key={item.slug} href={`/blog/${item.slug}`}
                  className="group rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.06]">
                  <span className="text-xs font-medium text-emerald-300">{item.category}</span>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-white group-hover:text-emerald-300 transition line-clamp-3">
                    {item.title}
                  </h3>
                  <span className="mt-3 inline-block text-xs text-slate-500">{item.readTime} citire</span>
                </Link>
              ))}
            </div>
          </section>
        )}

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
