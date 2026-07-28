import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

const canonical = "https://www.vosmart.ro/audit-financiar-contabil"

export const metadata: Metadata = {
  title: "Audit financiar-contabil pentru asociații de proprietari",
  description:
    "Audit financiar-contabil intern al asociației de proprietari: verificarea gestiunii, a fondurilor, a soldurilor și a documentelor justificative, cu raport de cenzor.",
  keywords: [
    "audit financiar contabil",
    "audit financiar contabil asociatie de proprietari",
    "verificare financiar contabila asociatie",
    "control financiar intern asociatie",
    "audit gestiune asociatie proprietari",
    "expertiza contabila asociatie",
  ],
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: canonical,
    title: "Audit financiar-contabil pentru asociații de proprietari | VoSmart",
    description:
      "Verificarea documentată a gestiunii asociației: solduri, fonduri, încasări, plăți și documente justificative.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "VoSmart — audit financiar-contabil asociații" }],
  },
}

const areas = [
  ["Gestiunea de casă și bancă", "Registrul de casă, disponibilul în numerar, operațiunile bancare și concordanța soldurilor cu extrasele emise de bancă."],
  ["Încasări și creanțe", "Sumele încasate de la proprietari, evidența pe apartament, restanțele și modul de urmărire a debitorilor."],
  ["Plăți și furnizori", "Facturile primite, plățile efectuate, contractele în derulare și existența documentelor justificative pentru fiecare ieșire de bani."],
  ["Fondurile asociației", "Fondul de rulment, fondul de reparații și fondurile speciale aprobate de proprietari, urmărite distinct de cheltuielile curente."],
  ["Repartizarea cheltuielilor", "Criteriile aplicate pe fiecare tip de cheltuială și corespondența dintre lista de întreținere afișată și documentele-sursă."],
  ["Obligații declarative și fiscale", "Reținerile aferente contractelor de muncă sau de prestări servicii și termenele de plată asumate de asociație."],
]

const findings = [
  ["Solduri care nu se reconciliază", "Diferențe între registrul de casă, extrasul bancar și situația raportată proprietarilor."],
  ["Cheltuieli fără document justificativ", "Plăți înregistrate fără factură, chitanță sau contract care să le susțină."],
  ["Fonduri folosite în alt scop", "Sume din fondul de reparații consumate pentru cheltuieli curente, fără hotărâre a adunării generale."],
  ["Repartizări inconsecvente", "Aceeași cheltuială împărțită după criterii diferite de la o lună la alta."],
  ["Restanțe neurmărite", "Debite vechi lăsate în evidență fără nicio măsură de recuperare."],
  ["Penalități calculate greșit", "Aplicarea unui procent peste plafonul aprobat sau calcul pe o bază eronată."],
]

const faqs = [
  ["Ce este auditul financiar-contabil al unei asociații de proprietari?", "Este verificarea documentată a gestiunii asociației: solduri, încasări, plăți, fonduri, liste de întreținere și documente justificative. La asociațiile de proprietari, această verificare se realizează prin activitatea de control financiar-contabil intern prevăzută de Legea 196/2018 și se finalizează cu un raport de cenzor."],
  ["Este același lucru cu auditul statutar?", "Nu. Auditul statutar este o misiune reglementată separat, rezervată auditorilor financiari autorizați, și nu este cerută asociațiilor de proprietari. VoSmart prestează controlul financiar-contabil intern specific asociațiilor, în calitate de cenzor, nu misiuni de audit statutar."],
  ["Cine poate face verificarea financiar-contabilă a asociației?", "Cenzorul sau comisia de cenzori, persoană fizică cu studii economice sau persoană juridică specializată, aleasă de adunarea generală a proprietarilor."],
  ["Cât de des ar trebui făcută verificarea?", "Recomandarea practică este o verificare trimestrială, plus una anuală înainte de adunarea generală. Verificările dese prind diferențele cât încă pot fi corectate, spre deosebire de un control unic la final de an."],
  ["Ce documente sunt necesare?", "Listele de întreținere, facturile și chitanțele, extrasele bancare, registrul de casă, ordinele de plată, contractele cu furnizorii, situația fondurilor și hotărârile adunării generale."],
  ["Ce se întâmplă dacă verificarea găsește nereguli?", "Neregulile sunt descrise în raport, cu documentul-sursă și suma implicată, împreună cu recomandarea de remediere. Raportul este prezentat proprietarilor, care decid măsurile în adunarea generală."],
]

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: "Audit financiar-contabil intern pentru asociații de proprietari",
      serviceType: "Verificare financiar-contabilă și control de gestiune",
      provider: { "@id": "https://www.vosmart.ro/#organization" },
      areaServed: [
        { "@type": "City", name: "București" },
        { "@type": "AdministrativeArea", name: "Ilfov" },
      ],
      audience: { "@type": "Audience", audienceType: "Asociații de proprietari" },
      url: canonical,
      description: metadata.description,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "VoSmart", item: "https://www.vosmart.ro/" },
        { "@type": "ListItem", position: 2, name: "Audit financiar-contabil", item: canonical },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faqs.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
}

export default function AuditFinanciarContabilPage() {
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
            <a href="#arie" className="transition hover:text-white">Aria verificării</a>
            <a href="#constatari" className="transition hover:text-white">Ce găsim</a>
            <a href="#intrebari" className="transition hover:text-white">Întrebări</a>
            <Link href="/#contact" className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500">Solicită ofertă</Link>
          </nav>
          <Link href="/#contact" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold md:hidden">Ofertă</Link>
        </div>
      </header>

      <section className="relative px-5 pb-24 pt-20 sm:px-6 lg:pb-32 lg:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">Control financiar-contabil intern · Legea 196/2018</div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              Audit financiar-contabil pentru asociații de proprietari
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              Verificăm documentat gestiunea asociației — solduri, fonduri, încasări, plăți și documente justificative — și transformăm rezultatul într-un raport de cenzor pe care proprietarii îl pot citi și contesta punctual, nu la nivel de impresie.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 font-semibold shadow-[0_0_35px_rgba(124,58,237,.35)] transition hover:brightness-110">Solicită o verificare</Link>
              <a href="#arie" className="inline-flex justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold transition hover:bg-white/10">Vezi aria verificării</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-slate-300">
              {['Constatări cu document-sursă', 'Analiză asistată de AI', 'Validare umană'].map(item => <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2">✓ {item}</span>)}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7 shadow-2xl sm:p-9">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">Clarificare necesară</p>
            <h2 className="mt-4 text-3xl font-bold">Ce fel de verificare îi trebuie unei asociații</h2>
            <p className="mt-4 leading-7 text-slate-400">
              Asociațiile de proprietari nu au obligația unui audit statutar. Ce le cere legea este controlul financiar-contabil intern, asigurat de cenzor — iar acesta este serviciul prestat de VoSmart.
            </p>
            <div className="mt-8 space-y-4">
              {['Verificarea gestiunii și a soldurilor', 'Urmărirea distinctă a fondurilor', 'Raport de cenzor pentru adunarea generală', 'Recomandări de remediere aplicabile'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 font-semibold text-emerald-300">{index + 1}</span>
                  <span className="text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="arie" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">Aria verificării</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce cuprinde verificarea financiar-contabilă</h2>
          <p className="mt-6 max-w-3xl leading-8 text-slate-400">
            Verificarea acoperă întregul circuit al banilor din asociație, de la suma încasată de la proprietar până la documentul care justifică plata către furnizor. Lista completă a documentelor este în ghidul despre{" "}
            <Link href="/blog/documente-verificate-de-cenzor" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">documentele verificate de cenzor</Link>.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {areas.map(([title, text], index) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-[#090d1c] p-7 transition hover:-translate-y-1 hover:border-emerald-400/25">
                <span className="text-sm font-semibold text-emerald-300">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="constatari" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Constatări frecvente</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce iese cel mai des la verificare</h2>
          <p className="mt-6 max-w-3xl leading-8 text-slate-400">
            Majoritatea problemelor nu vin din rea-credință, ci din evidențe ținute superficial. Vezi și analiza{" "}
            <Link href="/blog/greseli-frecvente-cenzorat-asociatii" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">greșelilor frecvente în cenzoratul asociațiilor</Link>{" "}
            și modul în care se verifică{" "}
            <Link href="/blog/fondul-de-rulment-verificare-cenzor" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">fondul de rulment</Link>.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {findings.map(([title, text]) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-gradient-to-br from-violet-500/[.07] to-transparent p-7">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[.07] via-violet-500/[.05] to-transparent p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">AI + expert uman</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Volumul îl parcurge AI-ul. Concluzia o semnează specialistul.</h2>
          </div>
          <div className="space-y-5 leading-8 text-slate-300">
            <p>
              O verificare serioasă înseamnă mii de linii de evidență. Analiza asistată de AI reconciliază sumele, compară lunile între ele și semnalează abaterile care merită privite atent — vezi{" "}
              <Link href="/blog/cum-detecteaza-ai-anomaliile-financiare-asociatie" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">cum detectează AI anomaliile financiare</Link>.
            </p>
            <p>
              Interpretarea rămâne umană. Nicio constatare nu ajunge în raport fără să fie verificată de un specialist, pentru că răspunderea profesională nu se poate automatiza.
            </p>
          </div>
        </div>
      </section>

      <section id="intrebari" className="border-t border-white/8 px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">Întrebări frecvente</p>
          <h2 className="mt-4 text-center text-3xl font-bold sm:text-5xl">Despre auditul financiar-contabil al asociației</h2>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold">
                  {question}<span className="text-2xl font-light text-emerald-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pt-4 leading-7 text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,.2)] md:p-14">
          <h2 className="text-3xl font-bold sm:text-5xl">Vrei situația reală a asociației, documentată?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-violet-100">Spune-ne perioada pe care vrei să o verificăm și dimensiunea asociației. Primești pașii necesari și o ofertă adaptată.</p>
          <Link href="/#contact" className="mt-8 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-violet-800 transition hover:bg-violet-50">Solicită o ofertă</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-sm text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <p>© 2026 VoSmart · Audit financiar-contabil pentru asociații de proprietari.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/firma-de-cenzorat" className="hover:text-white">Firmă de cenzorat</Link>
            <Link href="/cenzorat-asociatii" className="hover:text-white">Cenzorat asociații</Link>
            <Link href="/cenzorat-blocuri" className="hover:text-white">Cenzorat blocuri</Link>
            <Link href="/blog" className="hover:text-white">Ghiduri</Link>
            <a href="mailto:office@vosmart.ro" className="hover:text-white">office@vosmart.ro</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
