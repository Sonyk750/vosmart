import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

const canonical = "https://www.vosmart.ro/firma-de-cenzorat"

export const metadata: Metadata = {
  title: "Firmă de cenzorat pentru asociații de proprietari",
  description:
    "Firmă de cenzorat autorizată pentru asociații de proprietari: verificare financiar-contabilă, rapoarte de cenzor conforme Legii 196/2018 și analiză asistată de AI.",
  keywords: [
    "firma de cenzorat",
    "firma cenzorat bucuresti",
    "firma de cenzorat asociatii de proprietari",
    "servicii cenzorat",
    "cenzor persoana juridica",
    "contract cenzorat asociatie",
  ],
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: canonical,
    title: "Firmă de cenzorat pentru asociații de proprietari | VoSmart",
    description:
      "Cenzorat asigurat de o firmă, nu de o singură persoană: continuitate, responsabilitate contractuală și rapoarte online.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "VoSmart — firmă de cenzorat" }],
  },
}

const advantages = [
  ["Continuitate garantată", "O firmă nu pleacă în concediu și nu dispare la mijlocul mandatului. Verificarea continuă chiar dacă persoana alocată se schimbă."],
  ["Responsabilitate contractuală", "Relația este reglementată printr-un contract de prestări servicii, cu obligații, termene și livrabile asumate în scris."],
  ["Competențe combinate", "Dosarul este acoperit de mai mulți specialiști: partea contabilă, partea juridică și partea de raportare."],
  ["Capacitate pentru volume mari", "Asociațiile cu multe apartamente sau cu mai multe scări generează un volum de documente greu de acoperit de o singură persoană."],
  ["Instrumente digitale proprii", "Documentele, verificările și rapoartele stau într-o platformă, nu într-un dosar fizic sau într-un schimb de e-mailuri."],
  ["Independență față de administrator", "Firma de cenzorat nu are legături operaționale cu administratorul verificat, ceea ce protejează obiectivitatea controlului."],
]

const deliverables = [
  ["Raport de cenzor", "Documentul principal al mandatului: constatări, neconcordanțe, concluzii și recomandări, pregătit pentru adunarea generală."],
  ["Verificări periodice", "Controale pe parcursul anului, nu doar o singură verificare înainte de adunarea generală."],
  ["Situația fondurilor", "Fondul de rulment, fondul de reparații și celelalte fonduri aprobate, urmărite separat și reconciliate cu soldurile."],
  ["Analiza listelor de întreținere", "Modul de repartizare a cheltuielilor pe apartamente, încasările, restanțele și penalitățile aplicate."],
  ["Documentarea neconcordanțelor", "Fiecare diferență identificată este descrisă, cu documentul-sursă și cu recomandarea de remediere."],
  ["Acces online la documente", "Proprietarii și administratorul văd rapoartele în platformă, fără cereri repetate pe e-mail."],
]

const criteria = [
  ["01", "Verifică obiectul de activitate", "Firma trebuie să aibă activitate de expertiză contabilă sau financiar-contabilă înregistrată și persoane calificate care execută efectiv verificarea."],
  ["02", "Cere modelul de raport", "Un raport bun este citibil de un proprietar fără studii economice. Cere un exemplu înainte de semnare."],
  ["03", "Clarifică frecvența", "Stabilește din contract dacă verificarea este lunară, trimestrială sau anuală și ce se întâmplă la controale suplimentare."],
  ["04", "Confirmă independența", "Firma de cenzorat nu trebuie să presteze și administrarea aceleiași asociații — sunt roluri care se verifică reciproc."],
]

const faqs = [
  ["Poate o firmă să fie cenzor la o asociație de proprietari?", "Da. Legea 196/2018 permite ca funcția de cenzor să fie îndeplinită de o persoană fizică sau de o persoană juridică specializată, cu calificare în domeniul financiar-contabil. Asociația încheie în acest caz un contract de prestări servicii cu firma de cenzorat."],
  ["Ce avantaje are o firmă de cenzorat față de un cenzor individual?", "Continuitatea mandatului, responsabilitatea contractuală, capacitatea de a acoperi volume mari de documente și accesul la instrumente digitale de verificare. Un cenzor individual rămâne o opțiune validă pentru asociațiile mici."],
  ["Cum se alege firma de cenzorat?", "Firma este propusă și aprobată de adunarea generală a proprietarilor, iar decizia se consemnează în hotărâre. Ulterior se semnează contractul de prestări servicii care stabilește durata mandatului, frecvența verificărilor și livrabilele."],
  ["Firma de cenzorat se ocupă și de administrarea asociației?", "Nu. Cenzoratul și administrarea sunt roluri distincte și incompatibile în aceeași asociație: cenzorul verifică activitatea administratorului. VoSmart prestează exclusiv cenzorat."],
  ["Cât costă serviciile unei firme de cenzorat?", "Tariful depinde de numărul de apartamente, de volumul documentelor, de perioada analizată și de frecvența verificărilor. Oferta se stabilește după ce cunoaștem dimensiunea asociației."],
  ["În ce zone lucrează VoSmart?", "Serviciul complet de cenzorat este livrat în principal în București și Ilfov. Pentru asociațiile din alte județe, verificarea se poate organiza în format digital, pe baza documentelor încărcate în platformă."],
]

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: "Servicii de cenzorat prestate de firmă specializată",
      serviceType: "Cenzorat asociații de proprietari",
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
        { "@type": "ListItem", position: 2, name: "Firmă de cenzorat", item: canonical },
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

export default function FirmaDeCenzoratPage() {
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
            <a href="#avantaje" className="transition hover:text-white">Avantaje</a>
            <a href="#livrabile" className="transition hover:text-white">Ce livrăm</a>
            <a href="#alegere" className="transition hover:text-white">Cum alegi</a>
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
            <div className="mb-6 inline-flex rounded-full border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">Primul cenzorat cu AI · București și Ilfov</div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              Firmă de cenzorat pentru asociații de proprietari
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              VoSmart este o firmă de cenzorat care preia integral funcția de control financiar-contabil a asociației: verifică documentele, urmărește fondurile, analizează listele de întreținere și emite raportul de cenzor cerut de Legea 196/2018.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 font-semibold shadow-[0_0_35px_rgba(124,58,237,.35)] transition hover:brightness-110">Solicită o ofertă</Link>
              <a href="#avantaje" className="inline-flex justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold transition hover:bg-white/10">De ce o firmă, nu o persoană</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-slate-300">
              {['Contract de prestări servicii', 'Rapoarte online', 'Validare umană a concluziilor'].map(item => <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2">✓ {item}</span>)}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7 shadow-2xl sm:p-9">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" />
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Mandat acoperit integral</p>
            <h2 className="mt-4 text-3xl font-bold">Cenzoratul nu depinde de disponibilitatea unei singure persoane</h2>
            <p className="mt-4 leading-7 text-slate-400">
              Cea mai frecventă problemă a asociațiilor nu este lipsa unui cenzor, ci un cenzor care nu mai are timp. Un contract cu o firmă mută obligația de la o persoană la o organizație.
            </p>
            <div className="mt-8 space-y-4">
              {['Mandat acoperit pe toată durata contractului', 'Verificări periodice, nu doar înainte de adunare', 'Raport scris, cu documente-sursă indicate', 'Arhivă digitală accesibilă proprietarilor'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 font-semibold text-violet-300">{index + 1}</span>
                  <span className="text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[.03] p-8 md:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Ce înseamnă, legal, o firmă de cenzorat</h2>
          <div className="mt-6 grid gap-6 leading-8 text-slate-300 md:grid-cols-2">
            <div className="space-y-4">
              <p>
                Legea 196/2018 privind înființarea, organizarea și funcționarea asociațiilor de proprietari prevede că activitatea de control financiar-contabil intern este asigurată de un cenzor sau de o comisie de cenzori. Funcția poate fi îndeplinită atât de o persoană fizică cu studii economice, cât și de o persoană juridică specializată.
              </p>
              <p>
                Când asociația alege varianta persoanei juridice, raportul dintre părți se stabilește printr-un contract de prestări servicii, iar firma răspunde contractual pentru livrabilele asumate. Alegerea se aprobă în adunarea generală și se consemnează în hotărâre, la fel ca în cazul unui cenzor individual.
              </p>
            </div>
            <div className="space-y-4">
              <p>
                Diferența practică apare în execuție. Un cenzor individual acoperă singur întregul mandat; o firmă distribuie dosarul între specialiști, aplică o procedură repetabilă de verificare și păstrează trasabilitatea fiecărei constatări. Detaliile comparației sunt în articolul despre{" "}
                <Link href="/blog/firma-de-cenzorat-vs-cenzor-individual" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">firma de cenzorat vs cenzor individual</Link>.
              </p>
              <p>
                Indiferent de formă, obligațiile rămân aceleași: verificarea gestiunii, urmărirea fondurilor, controlul listelor de întreținere și prezentarea raportului în fața proprietarilor. Vezi lista completă în{" "}
                <Link href="/blog/documente-verificate-de-cenzor" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">ce documente verifică cenzorul</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="avantaje" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">De ce o firmă</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce câștigă asociația dintr-un contract cu o firmă de cenzorat</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {advantages.map(([title, text], index) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-[#090d1c] p-7 transition hover:-translate-y-1 hover:border-violet-400/25">
                <span className="text-sm font-semibold text-violet-300">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="livrabile" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Livrabile</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce primește concret asociația</h2>
          <p className="mt-6 max-w-3xl leading-8 text-slate-400">
            Un contract de cenzorat nu se măsoară în ore de verificare, ci în documente pe care proprietarii le pot citi și folosi. Structura raportului este descrisă pe larg în{" "}
            <Link href="/blog/raportul-de-cenzor-model-complet-2026" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200">modelul complet de raport de cenzor</Link>.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {deliverables.map(([title, text], index) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-[#090d1c] p-7 transition hover:-translate-y-1 hover:border-cyan-400/25">
                <span className="text-sm font-semibold text-cyan-300">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="alegere" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Criterii de selecție</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-5xl">Cum alegi firma de cenzorat potrivită</h2>
              <p className="mt-6 leading-8 text-slate-400">
                Patru verificări care separă un furnizor serios de o ofertă ieftină fără livrabile. Ghidul extins este în articolul despre{" "}
                <Link href="/blog/cum-alegi-firma-de-cenzorat" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">cum alegi firma de cenzorat</Link>.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {criteria.map(([number, title, text]) => (
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

      <section className="px-5 py-24 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[.08] via-violet-500/[.05] to-transparent p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Primul cenzorat cu AI</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Verificare asistată de AI, concluzii asumate de specialist</h2>
          </div>
          <div className="space-y-5 leading-8 text-slate-300">
            <p>
              VoSmart folosește inteligența artificială pentru a parcurge volumul de documente, a reconcilia sumele și a semnala preliminar diferențele. Asta scurtează partea mecanică a verificării și lasă timp pentru analiza situațiilor care chiar contează.
            </p>
            <p>
              AI-ul nu emite concluzii autonome. Fiecare observație este validată de un specialist înainte de a intra în raport, iar responsabilitatea profesională rămâne integral a firmei. Modul de funcționare este explicat în{" "}
              <Link href="/platforma-ai-cenzorat" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200">pagina platformei AI</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/[.06] p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.2em] text-cyan-300">Serviciul complet</p>
            <h2 className="mt-2 text-2xl font-bold">Cauți detalii despre cenzoratul asociației tale?</h2>
            <p className="mt-2 text-slate-400">Vezi aria verificării, procesul de lucru și etapele mandatului pe pagina dedicată serviciului.</p>
          </div>
          <Link href="/cenzorat-asociatii" className="shrink-0 rounded-xl border border-cyan-300/30 px-5 py-3 text-center font-semibold text-cyan-200 transition hover:bg-cyan-300/10">
            Cenzorat asociații →
          </Link>
        </div>
      </section>

      <section id="intrebari" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Întrebări frecvente</p>
          <h2 className="mt-4 text-center text-3xl font-bold sm:text-5xl">Despre firmele de cenzorat</h2>
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
          <h2 className="text-3xl font-bold sm:text-5xl">Vrei o firmă de cenzorat pentru asociația ta?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-violet-100">Spune-ne numărul de apartamente și perioada de verificat. Primești pașii concreți și o ofertă adaptată dimensiunii asociației.</p>
          <Link href="/#contact" className="mt-8 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-violet-800 transition hover:bg-violet-50">Solicită o ofertă</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-sm text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <p>© 2026 VoSmart · Firmă de cenzorat pentru asociații de proprietari.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/cenzorat-asociatii" className="hover:text-white">Cenzorat asociații</Link>
            <Link href="/cenzorat-blocuri" className="hover:text-white">Cenzorat blocuri</Link>
            <Link href="/audit-financiar-contabil" className="hover:text-white">Audit financiar-contabil</Link>
            <Link href="/blog" className="hover:text-white">Ghiduri</Link>
            <a href="mailto:office@vosmart.ro" className="hover:text-white">office@vosmart.ro</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
