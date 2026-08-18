import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Ecosistem } from "@/app/components/Ecosistem";

const canonical = "https://www.vosmart.ro/cenzorat-blocuri"

export const metadata: Metadata = {
  title: "Cenzorat blocuri — control financiar asociații",
  description:
    "Cenzorat blocuri pentru asociațiile de proprietari: verificarea listelor de întreținere, a fondurilor și a cheltuielilor pe scări, cu raport de cenzor online.",
  keywords: [
    "cenzorat blocuri",
    "cenzor bloc",
    "cenzorat asociatii de bloc",
    "verificare intretinere bloc",
    "control financiar bloc",
    "cenzorat scari de bloc",
  ],
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: canonical,
    title: "Cenzorat blocuri pentru asociații de proprietari | VoSmart",
    description:
      "Verificăm întreținerea, fondurile și cheltuielile pe scări, inclusiv pentru asociațiile cu mai multe blocuri.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "VoSmart — cenzorat blocuri" }],
  },
}

const specifics = [
  ["Repartizarea pe scări și tronsoane", "La blocurile cu mai multe scări, cheltuielile comune se împart după criterii diferite. Verificăm dacă repartizarea respectă hotărârile asociației și tipul fiecărei cheltuieli."],
  ["Consumuri de apă și diferențe", "Diferența dintre contorul de branșament și suma contoarelor din apartamente este cea mai contestată linie din listă. Urmărim modul de repartizare și consecvența lunară."],
  ["Cheltuieli pe cotă-parte indiviză", "Reparațiile la structură, fațadă, acoperiș sau subsol se repartizează pe cotă-parte, nu pe număr de persoane. Verificăm aplicarea corectă a criteriului."],
  ["Ascensor și părți comune parțiale", "Costul liftului și al altor părți comune parțiale privește doar proprietarii care le folosesc. Confirmăm că excluderile sunt aplicate consecvent."],
  ["Restanțe și penalități", "Verificăm modul de calcul al penalităților, respectarea plafonului aprobat și evidența separată a sumelor restante pe apartament."],
  ["Fondurile blocului", "Fondul de rulment și fondul de reparații trebuie urmărite distinct de cheltuielile curente, cu solduri reconciliate cu extrasele bancare."],
]

const steps = [
  ["01", "Preluăm evidențele blocului", "Liste de întreținere, facturi de utilități, extrase bancare, registrul de casă și hotărârile adunării generale."],
  ["02", "Reconstituim repartizarea", "Recalculăm cheltuielile pe apartamente și comparăm rezultatul cu listele afișate proprietarilor."],
  ["03", "Izolăm diferențele", "Fiecare abatere este documentată cu luna, suma și documentul-sursă, apoi discutată cu administratorul."],
  ["04", "Emitem raportul de cenzor", "Livrăm constatările, concluziile și recomandările într-un format pe care proprietarii îl pot citi și verifica."],
]

const faqs = [
  ["Ce înseamnă cenzorat pentru un bloc de locuințe?", "Este controlul financiar-contabil intern al asociației de proprietari care administrează blocul: verificarea încasărilor, a plăților, a listelor de întreținere, a fondurilor și a documentelor justificative, cu emiterea unui raport de cenzor conform Legii 196/2018."],
  ["Este obligatoriu cenzorul la asociațiile de bloc?", "Da. Legea 196/2018 prevede că asociația de proprietari trebuie să aibă asigurată activitatea de control financiar-contabil intern, printr-un cenzor sau o comisie de cenzori, indiferent de mărimea blocului."],
  ["Cum se verifică lista de întreținere a blocului?", "Se verifică sursa fiecărei cheltuieli, criteriul de repartizare aplicat, corespondența cu facturile furnizorilor și consecvența față de lunile anterioare. Procedura este detaliată în ghidul despre verificarea listelor de întreținere."],
  ["Ce se întâmplă dacă blocul are mai multe scări?", "Cheltuielile comune tuturor scărilor se repartizează diferit față de cele specifice unei singure scări. Cenzorul confirmă că separarea este aplicată corect și că proprietarii nu plătesc costuri care nu îi privesc."],
  ["Poate cenzorul verifica diferențele la apă?", "Da. Diferența dintre contorul de branșament și contoarele individuale intră în aria verificării: se urmărește modul de repartizare aprobat de asociație și aplicarea lui consecventă în fiecare lună."],
  ["Cât durează verificarea unui bloc?", "Depinde de numărul de apartamente și de perioada analizată. Analiza preliminară asistată de AI reduce semnificativ timpul necesar parcurgerii documentelor, iar concluziile sunt validate de un specialist."],
]

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: "Cenzorat pentru asociațiile de proprietari din blocuri",
      serviceType: "Control financiar-contabil intern al asociației de proprietari",
      provider: { "@id": "https://www.vosmart.ro/#organization" },
      areaServed: [
        { "@type": "City", name: "București" },
        { "@type": "AdministrativeArea", name: "Ilfov" },
      ],
      audience: { "@type": "Audience", audienceType: "Asociații de proprietari din blocuri de locuințe" },
      url: canonical,
      description: metadata.description,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "VoSmart", item: "https://www.vosmart.ro/" },
        { "@type": "ListItem", position: 2, name: "Cenzorat blocuri", item: canonical },
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

export default function CenzoratBlocuriPage() {
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
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">Blocuri și ansambluri rezidențiale</div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              Cenzorat blocuri pentru asociațiile de proprietari
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              Într-un bloc, aproape orice nemulțumire ajunge la aceeași întrebare: de ce apare suma asta în listă? VoSmart verifică evidențele asociației, recalculează repartizarea cheltuielilor și explică diferențele într-un raport de cenzor pe care proprietarii îl pot citi.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/#contact" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 font-semibold shadow-[0_0_35px_rgba(124,58,237,.35)] transition hover:brightness-110">Solicită o ofertă</Link>
              <a href="#verificari" className="inline-flex justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold transition hover:bg-white/10">Vezi ce verificăm</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-slate-300">
              {['Blocuri cu mai multe scări', 'Recalculul întreținerii', 'Raport online'].map(item => <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2">✓ {item}</span>)}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.02] p-7 shadow-2xl sm:p-9">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
            <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Specific blocurilor</p>
            <h2 className="mt-4 text-3xl font-bold">Problemele apar în repartizare, nu în totaluri</h2>
            <p className="mt-4 leading-7 text-slate-400">
              Totalul cheltuielilor poate fi corect, iar lista să fie totuși greșită: e suficient ca o cheltuială să fie împărțită după criteriul nepotrivit.
            </p>
            <div className="mt-8 space-y-4">
              {['Cheltuieli pe persoană vs. pe cotă-parte', 'Diferențe de consum la apă', 'Costuri de lift și părți comune parțiale', 'Penalități calculate peste plafonul aprobat'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 font-semibold text-cyan-300">{index + 1}</span>
                  <span className="text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="verificari" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Aria verificării</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">Ce verificăm într-un bloc de locuințe</h2>
          <p className="mt-6 max-w-3xl leading-8 text-slate-400">
            Verificarea pornește de la lista de întreținere și merge în urmă până la documentul care a generat fiecare sumă. Metoda completă este descrisă în ghidul despre{" "}
            <Link href="/blog/verificarea-listelor-de-intretinere-de-catre-cenzor" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200">verificarea listelor de întreținere de către cenzor</Link>.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {specifics.map(([title, text], index) => (
              <article key={title} className="rounded-3xl border border-white/8 bg-[#090d1c] p-7 transition hover:-translate-y-1 hover:border-cyan-400/25">
                <span className="text-sm font-semibold text-cyan-300">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[.03] p-8 md:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Obligațiile legale ale asociației de bloc</h2>
          <div className="mt-6 grid gap-6 leading-8 text-slate-300 md:grid-cols-2">
            <div className="space-y-4">
              <p>
                Legea 196/2018 nu face distincție între blocuri mari și blocuri mici: orice asociație de proprietari trebuie să aibă asigurat controlul financiar-contabil intern. Cenzorul verifică gestiunea, urmărește fondurile și prezintă raportul în fața adunării generale.
              </p>
              <p>
                Obligația nu dispare dacă asociația are un administrator autorizat sau o firmă de contabilitate. Rolurile sunt separate tocmai pentru ca cineva independent de execuție să confirme corectitudinea evidențelor. Detalii în articolul despre{" "}
                <Link href="/blog/cenzorat-blocuri-obligatii-legale" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200">obligațiile legale la cenzoratul blocurilor</Link>.
              </p>
            </div>
            <div className="space-y-4">
              <p>
                În practică, cele mai multe litigii dintre proprietari și asociație pornesc de la sume din lista de întreținere pe care nimeni nu le poate justifica documentat. Un mandat de cenzorat activ previne situația: diferențele sunt prinse lunar, nu după doi ani.
              </p>
              <p>
                Cenzorul verifică activitatea administratorului, dar nu o înlocuiește. Dacă asociația caută separat un administrator, o poate face printr-o firmă independentă de administrare imobile precum{" "}
                <a href="https://decoimob.ro/administrare-imobile" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200" rel="noopener">DecoImob</a>{" "}
                — o companie distinctă, nu un serviciu VoSmart.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="proces" className="border-y border-white/8 bg-white/[.025] px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-violet-300">Proces</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-5xl">Cum decurge verificarea</h2>
              <p className="mt-6 leading-8 text-slate-400">
                Patru etape, fiecare cu livrabil propriu. Nimic nu rămâne la stadiul de discuție verbală cu administratorul.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map(([number, title, text]) => (
                <div key={number} className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[.08] to-transparent p-6">
                  <span className="text-sm font-bold text-cyan-300">{number}</span>
                  <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 pt-24 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-violet-400/20 bg-violet-400/[.06] p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.2em] text-violet-300">Contract cu o firmă</p>
            <h2 className="mt-2 text-2xl font-bold">Preferi un mandat asigurat de o firmă, nu de o persoană?</h2>
            <p className="mt-2 text-slate-400">Vezi ce înseamnă contractual un cenzorat prestat de o persoană juridică specializată.</p>
          </div>
          <Link href="/firma-de-cenzorat" className="shrink-0 rounded-xl border border-violet-300/30 px-5 py-3 text-center font-semibold text-violet-200 transition hover:bg-violet-300/10">
            Firmă de cenzorat →
          </Link>
        </div>
      </section>

      <section id="intrebari" className="px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[.22em] text-cyan-300">Întrebări frecvente</p>
          <h2 className="mt-4 text-center text-3xl font-bold sm:text-5xl">Despre cenzoratul blocurilor</h2>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold">
                  {question}<span className="text-2xl font-light text-cyan-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pt-4 leading-7 text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-cyan-600 to-violet-600 p-8 text-center shadow-[0_0_80px_rgba(34,211,238,.18)] md:p-14">
          <h2 className="text-3xl font-bold sm:text-5xl">Blocul tău are nevoie de cenzor?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-cyan-50">Spune-ne câte apartamente și câte scări are asociația. Îți răspundem cu pașii de început și cu o ofertă adaptată.</p>
          <Link href="/#contact" className="mt-8 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-violet-800 transition hover:bg-violet-50">Solicită o ofertă</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-sm text-slate-400 sm:px-6">
        <Ecosistem className="mx-auto mb-6 max-w-7xl" />
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <p>© 2026 VoSmart · Cenzorat blocuri și asociații de proprietari.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/firma-de-cenzorat" className="hover:text-white">Firmă de cenzorat</Link>
            <Link href="/cenzorat-asociatii" className="hover:text-white">Cenzorat asociații</Link>
            <Link href="/audit-financiar-contabil" className="hover:text-white">Audit financiar-contabil</Link>
            <Link href="/blog" className="hover:text-white">Ghiduri</Link>
            <a href="mailto:office@vosmart.ro" className="hover:text-white">office@vosmart.ro</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
