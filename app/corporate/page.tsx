"use client";
import { useState, useEffect, Suspense } from "react";
import { Ecosistem } from "@/app/components/Ecosistem";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import FormularOferta from "@/app/components/FormularOferta";

const PACKAGES = [
  {
    key: "starter",
    name: "Starter",
    price: "350",
    priceLabel: "350 lei/lună",
    assoc: "10 dosare · 30 doc/dosar",
    max: 10,
    color: "cyan",
    features: ["10 dosare/lună (30 doc/dosar)", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Suport email", "Dosare suplimentare disponibile"],
  },
  {
    key: "business",
    name: "Business",
    price: "720",
    priceLabel: "720 lei/lună",
    assoc: "25 dosare · 30 doc/dosar",
    max: 25,
    color: "violet",
    recommended: true,
    features: ["25 dosare/lună (30 doc/dosar)", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Suport prioritar", "Dosare suplimentare disponibile"],
  },
  {
    key: "professional",
    name: "Professional",
    price: "1390",
    priceLabel: "1.390 lei/lună",
    assoc: "50 dosare · 30 doc/dosar",
    max: 50,
    color: "cyan",
    features: ["50 dosare/lună (30 doc/dosar)", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Cenzori multipli", "Suport dedicat"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "0",
    priceLabel: "Preț personalizat",
    assoc: "50+ dosare · 30 doc/dosar",
    max: 9999,
    color: "violet",
    features: ["Dosare nelimitate (30 doc/dosar)", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Cenzori multipli", "API access", "Manager de cont dedicat"],
  },
];

const isKnownPackage = (pkg: string) => PACKAGES.some(p => p.key === pkg) || pkg === "trial";

// Pachetul vine din fragment (`#pachet-business`), nu din query string: fragmentul
// nu creeaza URL-uri separate, deci nu genereaza copii duplicate ale paginii in index.
// `?package=` ramane suportat doar pentru linkurile vechi deja trimise pe email.
function PackageFromUrl({ onPackage }: { onPackage: (pkg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const apply = () => {
      const fromHash = window.location.hash.replace(/^#pachet-/, "");
      const pkg = window.location.hash.startsWith("#pachet-") ? fromHash : searchParams.get("package");
      if (pkg && isKnownPackage(pkg)) onPackage(pkg);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [searchParams, onPackage]);
  return null;
}

export default function CorporatePage() {
  const [selectedPackage, setSelectedPackage] = useState("business");
  // Starea de inregistrare a plecat odata cu pilnia: pachetul ales serveste
  // acum doar la a spune ce ofera ceri, in mesajul care ajunge pe email.

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <Suspense fallback={null}>
        <PackageFromUrl onPackage={setSelectedPackage} />
      </Suspense>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.32),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.20),transparent_40%)]" />
        <div style={{ position:"absolute",inset:0, backgroundImage:"linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48}
              className="h-auto" style={{ mixBlendMode:"screen", width:"90px" }} />
          </a>
          <a href="/" className="text-sm text-slate-400 hover:text-white transition">← Înapoi la site</a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 py-16 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
          </span>
          Soluție pentru firme de cenzorat
        </div>
        <h1 className="text-4xl font-bold md:text-5xl mb-4">
          VoSmart{" "}
          <span style={{ background:"linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Corporate
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-300">
          Platforma completă pentru firme de cenzorat. Gestionează toate asociațiile tale cliente, emite rapoarte cu AI și oferă un portal modern clienților tăi.
        </p>
      </section>

      {/* Trial card */}
      <section className="px-5 pb-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div
            onClick={() => setSelectedPackage("trial")}
            className={`relative rounded-[2rem] border cursor-pointer transition hover:-translate-y-1 p-6 md:p-8 ${selectedPackage === "trial"
              ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.20)]"
              : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/35"}`}>
            {selectedPackage === "trial" && (
              <div className="absolute top-4 right-4 text-emerald-400 text-lg">✓</div>
            )}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                    TRIAL GRATUIT
                  </span>
                  <span className="text-xs text-slate-500">Fără card, fără angajament</span>
                </div>
                <h3 className="text-xl font-bold mb-1">Încearcă VoSmart Corporate</h3>
                <p className="text-slate-400 text-sm">Testați platforma fără costuri. Acces complet pentru 1 asociație.</p>
              </div>
              <div className="flex gap-6 md:gap-10 text-sm">
                {[
                  ["1", "asociație"],
                  ["1", "sesiune upload"],
                  ["1", "raport AI"],
                ].map(([val, lbl]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-2xl font-bold text-amber-300">{val}</p>
                    <p className="text-xs text-slate-500">{lbl}</p>
                  </div>
                ))}
              </div>
              <div className="md:text-right">
                <p className="text-3xl font-bold text-amber-300">0 lei</p>
                <p className="text-xs text-slate-500">gratuit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pachete plătite */}
      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-6">sau alege un plan complet</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PACKAGES.map(pkg => (
              <div key={pkg.key}
                onClick={() => setSelectedPackage(pkg.key)}
                className={`relative rounded-3xl border p-6 cursor-pointer transition hover:-translate-y-1 ${selectedPackage === pkg.key
                  ? pkg.color === "violet" ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_40px_rgba(124,58,237,0.25)]"
                  : "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.20)]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.5)] whitespace-nowrap">
                    Recomandat
                  </div>
                )}
                {selectedPackage === pkg.key && (
                  <div className="absolute top-4 right-4 text-emerald-400 text-lg">✓</div>
                )}
                <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${pkg.color === "violet" ? "border-violet-500/30 text-violet-300" : "border-cyan-500/30 text-cyan-300"}`}>
                  {pkg.name}
                </div>
                <div className="mb-1">
                  <span className="text-3xl font-bold">{pkg.key === "enterprise" ? "Personalizat" : pkg.price}</span>
                  {pkg.key !== "enterprise" && <span className="text-slate-400 text-sm"> lei/lună</span>}
                </div>
                <p className={`text-sm font-medium mb-4 ${pkg.color === "violet" ? "text-violet-300" : "text-cyan-300"}`}>{pkg.assoc}</p>
                <ul className="space-y-2">
                  {pkg.features.map(f => (
                    <li key={f} className="flex gap-2 text-xs text-slate-300">
                      <span className={pkg.color === "violet" ? "text-violet-400" : "text-cyan-400"}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formular */}
      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-lg">
          {/* Nu mai exista inscriere de sine statatoare: contractele de cenzorat se
              semneaza intre noi si asociatie, nu se cumpara dintr-un formular. Ce
              ramane aici e o cerere de oferta, care ajunge pe email. */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <h3 className="text-lg font-semibold">Cere o ofertă</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Spune-ne câte asociații ai în portofoliu și îți răspundem cu o ofertă și cu pașii
              pentru contract. Pachetul ales acum:{" "}
              <strong className="text-white">{PACKAGES.find(p => p.key === selectedPackage)?.name ?? "Business"}</strong>.
            </p>
            <FormularOferta pachet={PACKAGES.find(p => p.key === selectedPackage)?.name ?? "Business"} />
            <p className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-slate-400">
              Ai deja cont?{" "}
              <a href="/login" className="font-semibold text-violet-300 transition hover:text-violet-200">Autentifică-te</a>
            </p>
          </div>
        </div>
      </section>

      {/* Prezentare — conținut indexabil, în afara formularului */}
      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-10 text-slate-300">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Ce este VoSmart Corporate</h2>
            <p className="leading-relaxed">
              VoSmart Corporate este platforma dedicată firmelor de cenzorat și cenzorilor care lucrează cu
              mai multe asociații de proprietari în paralel. În locul dosarelor pe hârtie și al fișierelor
              împrăștiate pe email, fiecare asociație primește un dosar digital propriu: documentele
              financiar-contabile sunt încărcate într-un singur loc, analizate automat și transformate în
              rapoarte pe care cenzorul le verifică și le semnează. Contul rămâne al firmei de cenzorat —
              VoSmart nu se substituie cenzorului, ci îi scurtează munca repetitivă de verificare.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Cum funcționează, pas cu pas</h2>
            <ol className="space-y-3 leading-relaxed list-decimal pl-5 marker:text-violet-400">
              <li>
                <strong className="text-white">Creezi dosarul asociației.</strong> Datele firmei se
                completează automat din CUI, iar fiecare asociație client primește un spațiu separat, cu
                istoric propriu pe ani și trimestre.
              </li>
              <li>
                <strong className="text-white">Încarci documentele.</strong> Liste de întreținere, extrase
                de cont, registre de casă, facturi, chitanțe și balanțe — până la 30 de documente per dosar,
                în funcție de pachet.
              </li>
              <li>
                <strong className="text-white">AI-ul analizează și semnalează.</strong> Sistemul verifică
                soldurile, corelează încasările cu plățile și marchează diferențele și documentele lipsă.
                Vezi în detaliu{" "}
                <Link href="/blog/cum-detecteaza-ai-anomaliile-financiare-asociatie" className="text-cyan-300 hover:underline">
                  cum detectează AI anomaliile financiare
                </Link>{" "}
                dintr-o asociație.
              </li>
              <li>
                <strong className="text-white">Cenzorul validează și emite raportul.</strong> Nicio concluzie
                nu pleacă spre asociație fără verificare umană. Rezultatul este un{" "}
                <Link href="/blog/raportul-de-cenzor-model-complet-2026" className="text-cyan-300 hover:underline">
                  raport de cenzor conform Legii 196/2018
                </Link>.
              </li>
              <li>
                <strong className="text-white">Asociația primește acces în portal.</strong> Comitetul
                executiv și proprietarii pot consulta rapoartele online, fără să mai ceară documente pe email.
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Pentru cine este platforma</h2>
            <p className="leading-relaxed">
              Platforma este gândită pentru firmele de cenzorat care administrează portofolii de la câteva
              asociații până la zeci de dosare lunar, dar și pentru cenzorii persoane fizice care vor să
              treacă la un flux digital. Diferența dintre cele două forme de organizare — continuitate,
              răspundere contractuală și capacitate de lucru — este explicată în articolul despre{" "}
              <Link href="/blog/firma-de-cenzorat-vs-cenzor-individual" className="text-cyan-300 hover:underline">
                firmă de cenzorat vs cenzor individual
              </Link>. Dacă reprezinți o asociație care caută un cenzor, nu o firmă care oferă servicii, pagina
              potrivită este{" "}
              <Link href="/cenzorat-asociatii" className="text-cyan-300 hover:underline">
                cenzorat asociații de proprietari
              </Link>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Cum alegi pachetul</h2>
            <p className="leading-relaxed">
              Pachetele se diferențiază prin numărul de dosare procesate lunar, nu prin funcționalitățile de
              analiză: verificarea asistată de AI și generarea rapoartelor sunt incluse la toate nivelurile.
              Starter acoperă până la 10 dosare pe lună, Business 25, Professional 50, iar Enterprise
              portofoliile mai mari, cu manager de cont și acces API. Trialul gratuit permite testarea
              fluxului complet pe un dosar real, fără card și fără angajament. Dacă volumul crește, pachetul
              se poate schimba oricând.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <Ecosistem className="mx-auto mb-6 max-w-4xl px-5 text-left" />
        <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={35}
          className="h-auto mx-auto mb-3" style={{ mixBlendMode:"screen", width:"70px" }} />
        <p className="text-xs text-slate-600">© 2026 VoSmart. Platformă proprietară. Toate drepturile rezervate.</p>
      </footer>
    </main>
  );
}
