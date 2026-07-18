import type { Metadata } from "next"
import Link from "next/link"

const canonical = "https://www.vosmart.ro/platforma-ai-cenzorat"

export const metadata: Metadata = {
  title: "Platformă AI pentru firme de cenzorat și cenzori | VoSmart",
  description:
    "VoSmart ajută firmele de cenzorat și cenzorii profesioniști să organizeze documentele, să analizeze datele cu AI și să pregătească rapoarte verificate uman.",
  alternates: { canonical },
  openGraph: {
    title: "Platformă AI pentru firme de cenzorat și cenzori | VoSmart",
    description:
      "Analiză asistată de AI, dosare digitale și rapoarte de cenzorat validate de profesioniști.",
    url: canonical,
    type: "website",
    locale: "ro_RO",
  },
}

const capabilities = [
  ["Analiză asistată de AI", "Identifică mai rapid neconcordanțe și zone care necesită verificare profesională."],
  ["Dosare digitale", "Documentele fiecărei asociații sunt centralizate și ușor de urmărit."],
  ["Schițe de raport", "Generează o bază structurată pe care cenzorul o verifică, ajustează și aprobă."],
  ["Portal pentru clienți", "Asociațiile primesc acces controlat la documentele și rapoartele publicate."],
  ["Lucru în echipă", "Organizați clienții și activitatea colaboratorilor într-un singur flux."],
  ["Trasabilitate", "Păstrați o evidență clară a documentelor analizate și a rapoartelor emise."],
]

const workflow = [
  ["01", "Creezi asociația", "Deschizi dosarul digital al clientului și stabilești perioada analizată."],
  ["02", "Încarci documentele", "Centralizezi balanțe, registre, extrase și documente justificative."],
  ["03", "Rulezi analiza AI", "Platforma evidențiază datele și posibilele neconcordanțe relevante."],
  ["04", "Validezi profesional", "Cenzorul verifică rezultatele și formulează concluziile finale."],
  ["05", "Publici raportul", "Raportul aprobat este pus la dispoziția asociației în portal."],
]

const faq = [
  ["VoSmart înlocuiește cenzorul?", "Nu. AI-ul asistă analiza și organizarea datelor, iar verificarea, concluziile și aprobarea raportului aparțin profesionistului."],
  ["Cui se adresează platforma?", "Firmelor de cenzorat, cenzorilor independenți și profesioniștilor care gestionează verificări pentru una sau mai multe asociații de proprietari."],
  ["Asociațiile pot cumpăra direct serviciul de cenzorat?", "Da. Asociațiile care doresc serviciul complet pot solicita o ofertă VoSmart pe pagina dedicată cenzoratului pentru asociații."],
  ["Pot testa aplicația?", "Da. Firmele și cenzorii pot porni din pagina Corporate, unde sunt disponibile accesul, testarea și opțiunile de abonament."],
]

export default function PlatformaAiCenzoratPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "VoSmart AI pentru cenzorat",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: canonical,
      description: metadata.description,
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Firme de cenzorat și cenzori profesioniști",
      },
      provider: { "@type": "Organization", name: "VoSmart", url: "https://www.vosmart.ro" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Acasă", item: "https://www.vosmart.ro" },
        { "@type": "ListItem", position: 2, name: "Platformă AI pentru cenzorat", item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ]

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[650px] bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.16),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,.18),transparent_36%)]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="text-xl font-black tracking-tight">Vo<span className="text-cyan-300">Smart</span></Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/cenzorat-asociatii" className="hidden text-slate-300 transition hover:text-white sm:inline">Pentru asociații</Link>
          <Link href="/corporate/login" className="rounded-full border border-white/15 px-4 py-2 text-slate-100 transition hover:border-cyan-300/60">Autentificare</Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:pt-24">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[.3em] text-cyan-300">Pentru firme de cenzorat și cenzori profesioniști</p>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Cenzorat mai rapid, cu <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">AI asistiv</span> și control profesional.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            VoSmart organizează documentele, asistă verificarea financiar-contabilă și pregătește schița raportului. Cenzorul analizează, corectează și aprobă rezultatul final.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/corporate?package=trial" className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200">Testează platforma</Link>
            <Link href="#cum-functioneaza" className="rounded-full border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:border-violet-300/60">Vezi fluxul de lucru</Link>
          </div>
          <p className="mt-5 text-sm text-slate-400">AI-ul asistă profesionistul. Nu emite autonom concluzii și nu înlocuiește cenzorul.</p>
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-white/[.055] p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div><p className="text-xs text-slate-500">DOSAR CURENT</p><p className="mt-1 font-semibold">Asociația Exemplu</p></div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Analiză pregătită</span>
            </div>
            <div className="mt-5 space-y-3">
              {["Documente centralizate", "Verificări AI finalizate", "Observații de validat", "Schiță raport disponibilă"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4">
                  <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${index < 2 ? "bg-cyan-300 text-slate-950" : "bg-violet-400/15 text-violet-200"}`}>{index + 1}</span>
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-violet-300">Un singur spațiu de lucru</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-black sm:text-5xl">Instrumentele necesare unei activități de cenzorat bine organizate.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([title, description], index) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-slate-900/65 p-6 transition hover:-translate-y-1 hover:border-cyan-300/30">
                <span className="text-sm font-black text-cyan-300">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cum-functioneaza" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan-300">Flux controlat</p>
            <h2 className="mt-4 text-3xl font-black sm:text-5xl">De la documente la raport, fără să pierzi controlul profesional.</h2>
            <p className="mt-6 leading-7 text-slate-400">Fiecare etapă separă clar automatizarea utilă de decizia care îi aparține cenzorului.</p>
          </div>
          <div className="space-y-3">
            {workflow.map(([number, title, description]) => (
              <article key={number} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:grid-cols-[64px_1fr] sm:items-center">
                <span className="text-2xl font-black text-violet-300">{number}</span>
                <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-slate-400">{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[.07] p-8 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">Ești firmă de cenzorat?</p>
            <h2 className="mt-4 text-3xl font-black">Digitalizează-ți activitatea cu VoSmart AI.</h2>
            <p className="mt-4 leading-7 text-slate-300">Testează fluxul pentru o asociație și vezi cum se integrează în modul tău de lucru.</p>
            <Link href="/corporate?package=trial" className="mt-7 inline-flex rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950">Pornește testarea</Link>
          </article>
          <article className="rounded-[2rem] border border-violet-300/20 bg-violet-400/[.07] p-8 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-violet-300">Reprezinți o asociație?</p>
            <h2 className="mt-4 text-3xl font-black">Ai nevoie de serviciul complet de cenzorat?</h2>
            <p className="mt-4 leading-7 text-slate-300">VoSmart poate prelua serviciul, iar asociația beneficiază de verificare profesională și acces digital.</p>
            <Link href="/cenzorat-asociatii" className="mt-7 inline-flex rounded-full border border-violet-300/40 px-6 py-3 font-bold text-violet-100">Cenzorat pentru asociații</Link>
          </article>
        </div>
      </section>

      <section className="border-t border-white/8 bg-slate-950/50 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-black sm:text-5xl">Întrebări despre platforma AI</h2>
          <div className="mt-10 space-y-3">
            {faq.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <summary className="cursor-pointer list-none font-bold">{question}<span className="float-right text-cyan-300 group-open:rotate-45">+</span></summary>
                <p className="mt-4 leading-7 text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
