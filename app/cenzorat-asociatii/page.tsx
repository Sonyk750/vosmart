import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

const canonical = "https://www.vosmart.ro/cenzorat-asociatii"

export const metadata: Metadata = {
  title: "Cenzorat asociații de proprietari București și Ilfov",
  description:
    "Servicii de cenzorat pentru asociații de proprietari din București și Ilfov: verificări financiar-contabile, rapoarte clare și analiză asistată de AI.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: canonical,
    title: "Cenzorat pentru asociații de proprietari | VoSmart",
    description:
      "Verificări financiar-contabile, raportare online și analiză asistată de AI, cu validare umană.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "VoSmart — cenzorat asociații de proprietari" }],
  },
}

const checks = [
  ["Documente și plăți", "Facturi, chitanțe, ordine de plată, extrase bancare și documentele justificative aferente."],
  ["Casă și bancă", "Registrul de casă, disponibilul în numerar, operațiunile bancare și concordanța soldurilor."],
  ["Liste de întreținere", "Repartizarea cheltuielilor, fișele apartamentelor, încasările și eventualele penalități."],
  ["Fondurile asociației", "Fondul de rulment, fondul de reparații și celelalte fonduri aprobate de proprietari."],
  ["Furnizori și obligații", "Plățile către furnizori, contractele relevante și obligațiile declarative ale asociației."],
  ["Raportare și trasabilitate", "Observații documentate, neconcordanțe identificate și recomandări ușor de urmărit."],
]

const steps = [
  ["01", "Preluăm documentele", "Stabilim perioada verificată și setul de documente necesare."],
  ["02", "Analizăm operațiunile", "Verificăm înregistrările, soldurile, plățile, listele și documentele suport."],
  ["03", "Clarificăm diferențele", "Solicităm explicații sau documente suplimentare pentru situațiile neclare."],
  ["04", "Emitem raportul", "Livrăm concluziile și recomandările într-un raport accesibil online."],
]

const faqs = [
  ["Ce verifică un cenzor la o asociație de proprietari?", "Sunt verificate documentele financiar-contabile, încasările și plățile, registrele, listele de întreținere, fondurile, soldurile și documentele justificative ale asociației."],
  ["Cât de des se face verificarea?", "Frecvența se stabilește în funcție de mandat, volumul documentelor și nevoile asociației. Verificarea poate fi periodică, lunară, trimestrială sau pentru o perioadă punctuală."],
  ["Ce documente trebuie pregătite?", "De regulă sunt necesare listele de întreținere, facturile, chitanțele, extrasele bancare, registrul de casă, ordinele de plată, contractele și situația fondurilor."],
  ["Cum este folosită inteligența artificială?", "AI-ul VoSmart asistă analiza preliminară și organizarea informațiilor. Concluziile și raportul final sunt verificate și validate de un specialist uman."],
  ["De ce depinde tariful serviciului?", "Tariful depinde de numărul de apartamente, volumul documentelor, perioada analizată, frecvența verificărilor și complexitatea situației asociației."],
]

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: "Cenzorat pentru asociații de proprietari",
      serviceType: "Servicii de cenzorat și verificare financiar-contabilă",
      provider: { "@id": "https://www.vosmart.ro/#organization" },
      areaServed: [
        { "@type": "City", name: "București" },
        { "@type": "AdministrativeArea", name: "Ilfov" },
      ],
      url: canonical,
      description: metadata.description,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "VoSmart", item: "https://www.vosmart.ro/" },
        { "@type": "ListItem", position: 2, name: "Cenzorat asociații", item: canonical },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
}

export default function CenzoratAsociatiiPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050814] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-white/10 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" aria-label="VoSmart — pagina principală" className="flex items-center gap-3">
            <Image src="/logo-vosmart.png" width={42} height={42} alt="VoSmart" className="rounded-xl" />
            <span className="text-xl font-semibold">VoSmart</span>
          </Link>
          <nav aria-label="Navigație pagină" className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#verificari" className="transition hover:text-white">Ce verificăm</a>
            <a href="#proces" className="transition hover:text-white">Proces</a>
            <a href="#intrebari" className="transition hover:text-white">Întrebări</a>
            <Link href="/#contact" className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500">Solicită ofertă</Link>
          </nav>
          <Link href="/#contact" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold md:hidden">Ofertă</Link>
        </div>
      </header>

      <section className="relative px-5 pb-24 pt-20 sm:px-6 lg:pb-32 lg:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">București și Ilfov · raportare digitală</div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              Cenzorat pentru asociații, cu verificări clare și tehnologie modernă
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              VoSmart verifică activitatea financiar-contabilă a asociației de proprietari și transformă documentele într-un raport ușor de înțeles, cu observații, concluzii și recomandări documentate.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 font-semibold shadow-[0_0_35px_rgba(124,58,237,.35)] transition hover:brightness-110">Discută cu un specialist</Link>
              <a href="#verificari" className="inline-flex justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold transition hover:bg-white/10">Vezi ce verificăm</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-slate-300">
              {['Rapoarte online', 'Analiză asistată de AI', 'Validare umană'].map(item => <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2">✓ {item}</span>)}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7 shadow-2xl sm:p-9">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Control documentat</p>
            <h2 className="mt-4 text-3xl font-bold">O imagine clară asupra situației asociației</h2>
            <p className="mt-4 leading-7 text-slate-400">Verificarea urmărește concordanța dintre documente, operațiuni, solduri și hotărârile asociației.</p>
            <div className="mt-8 space-y-4">
              {['Documente financiar-contabile organizate', 'Neconcordanțe explicate și urmărite', 'Recomandări aplicabile pentru remediere', 'Raport disponibil în platforma VoSmart'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 font-semibold text-violet-300">{index + 1}</span>
                  <span className="text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/[.06] p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.2em] text-cyan-300">Pentru profesioniști</p>
            <h2 className="mt-2 text-2xl font-bold">Ești firmă de cenzorat sau cenzor independent?</h2>
            <p className="mt-2 text-slate-400">Descoperă aplicația VoSmart pentru analiză asistată de AI, dosare digitale și rapoarte validate profesional.</p>
          </div>
          <Link href="/platforma-ai-cenzorat" className="shrink-0 rounded-xl border border-cyan-300/30 px-5 py-3 text-center font-semibold text-cyan-200 transition hover:bg-cyan-300/10">
            Vezi platforma AI →
          </Link>
        </div>
      </section>

      <section id="verificari" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Aria verificării</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce verificăm în cadrul serviciului de cenzorat</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {checks.map(([title, text], index) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-[#090d1c] p-7 transition hover:-translate-y-1 hover:border-violet-400/25">
                <span className="text-sm font-semibold text-cyan-300">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proces" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Proces transparent</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-5xl">De la documente la un raport util</h2>
              <p className="mt-6 leading-8 text-slate-400">Fiecare etapă păstrează trasabilitatea verificării și reduce schimburile neclare de informații.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map(([number, title, text]) => (
                <div key={number} className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/[.08] to-transparent p-6">
                  <span className="text-sm font-bold text-violet-300">{number}</span>
                  <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[.08] via-violet-500/[.05] to-transparent p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">AI + expert uman</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Tehnologia accelerează analiza. Specialistul validează concluziile.</h2>
          </div>
          <div className="space-y-5 leading-8 text-slate-300">
            <p>VoSmart folosește inteligența artificială pentru organizarea informațiilor, identificarea preliminară a neconcordanțelor și pregătirea analizei.</p>
            <p>AI-ul nu înlocuiește responsabilitatea profesională: raportul final este verificat și validat înainte de publicare.</p>
          </div>
        </div>
      </section>

      <section id="intrebari" className="border-t border-white/8 px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Întrebări frecvente</p>
          <h2 className="mt-4 text-center text-3xl font-bold sm:text-5xl">Informații înainte de colaborare</h2>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold">
                  {question}<span className="text-2xl font-light text-violet-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pt-4 leading-7 text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,.2)] md:p-14">
          <h2 className="text-3xl font-bold sm:text-5xl">Ai nevoie de cenzorat pentru asociația ta?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-violet-100">Spune-ne numărul de apartamente și perioada pe care dorești să o verificăm. Îți răspundem cu pașii necesari și o ofertă adaptată.</p>
          <Link href="/#contact" className="mt-8 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-violet-800 transition hover:bg-violet-50">Solicită o ofertă</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-sm text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <p>© 2026 VoSmart · Cenzorat modern pentru asociații de proprietari.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/blog" className="hover:text-white">Ghiduri</Link>
            <Link href="/help" className="hover:text-white">Ajutor</Link>
            <a href="mailto:office@vosmart.ro" className="hover:text-white">office@vosmart.ro</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
