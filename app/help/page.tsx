"use client";
import { useState } from "react";
import Image from "next/image";

const steps = [
  {
    id: 1,
    icon: "🏢",
    title: "Înregistrare și activare cont",
    color: "violet",
    summary: "Creează-ți contul corporate și activează-l",
    content: [
      { bold: "1.", text: " Accesează pagina " },
      { bold: "Corporate", text: " din meniu și completează formularul de înregistrare." },
      { nl: true },
      { bold: "2.", text: " Vei primi un email de confirmare. Apasă pe linkul de activare." },
      { nl: true },
      { bold: "3.", text: " Contul trial îți permite să încarci " },
      { bold: "un dosar de 5 documente", text: " gratuit." },
      { nl: true },
      { bold: "4.", text: " Pentru mai multe dosare, alege un pachet din secțiunea Pachete." },
    ],
  },
  {
    id: 2,
    icon: "📁",
    title: "Pregătirea documentelor",
    color: "cyan",
    summary: "Ce documente sunt necesare pentru un dosar complet",
    content: [
      { bold: "Documente obligatorii:" },
      { nl: true },
      { text: "📋 " }, { bold: "Lista de plată", text: " — cheltuielile lunare ale asociației" },
      { nl: true },
      { text: "📝 " }, { bold: "Explicații listă", text: " — detalierea cheltuielilor" },
      { nl: true },
      { text: "📊 " }, { bold: "Distribuția facturilor", text: " — repartizarea pe apartamente" },
      { nl: true },
      { text: "🧾 " }, { bold: "Facturi furnizori", text: " — facturile de utilități și servicii" },
      { nl: true },
      { nl: true },
      { bold: "Documente opționale:" },
      { nl: true },
      { text: "🏦 " }, { bold: "Extras cont bancar", text: " — situația contului curent" },
    ],
  },
  {
    id: 3,
    icon: "⬆️",
    title: "Încărcarea dosarului",
    color: "amber",
    summary: "Cum trimiți documentele pentru analiză",
    content: [
      { bold: "1.", text: " Intră în " }, { bold: "Dashboard → Documente" },
      { nl: true },
      { bold: "2.", text: " Selectează " }, { bold: "perioada", text: " (luna și anul) pentru care încarci documentele." },
      { nl: true },
      { bold: "3.", text: " Încarcă fiecare document în câmpul corespunzător (PDF sau imagini)." },
      { nl: true },
      { bold: "4.", text: " Apasă " }, { bold: "\"Trimite dosar la analiză AI\"" }, { text: "." },
      { nl: true },
      { bold: "5.", text: " Analiza durează " }, { bold: "30-60 secunde", text: ". Nu închide pagina!" },
    ],
  },
  {
    id: 4,
    icon: "🤖",
    title: "Analiza AI",
    color: "blue",
    summary: "Ce verifică inteligența artificială",
    content: [
      { text: "Sistemul AI analizează automat:" },
      { nl: true },
      { nl: true },
      { text: "✓ " }, { bold: "Registrul de casă", text: " — sold inițial/final, chitanțe, plafon de casă" },
      { nl: true },
      { text: "✓ " }, { bold: "Situația bancară", text: " — sold cont curent, depozite, furnizori neachitați" },
      { nl: true },
      { text: "✓ " }, { bold: "Fonduri", text: " — rulment, reparații, alte fonduri" },
      { nl: true },
      { text: "✓ " }, { bold: "Restanțieri", text: " — apartamente cu restanțe și sume" },
      { nl: true },
      { text: "✓ " }, { bold: "Legalitatea cheltuielilor", text: " — documente justificative, bonuri cu CUI" },
      { nl: true },
      { text: "✓ " }, { bold: "Conformitate legală", text: " — Legea 196/2018" },
      { nl: true },
      { nl: true },
      { text: "Scorul de corectitudine (0-100%) reflectă conformitatea documentelor." },
    ],
  },
  {
    id: 5,
    icon: "📋",
    title: "Raportul de admin",
    color: "emerald",
    summary: "Cum primești și folosești raportul final",
    content: [
      { bold: "1.", text: " După analiză, adminul VoSmart " }, { bold: "revizuiește", text: " raportul generat de AI." },
      { nl: true },
      { bold: "2.", text: " Adminul poate " }, { bold: "modifica și completa", text: " raportul înainte de publicare." },
      { nl: true },
      { bold: "3.", text: " Raportul aprobat apare în secțiunea " }, { bold: "Rapoarte", text: " din dashboard-ul tău." },
      { nl: true },
      { bold: "4.", text: " Poți " }, { bold: "descărca", text: " raportul în format text pentru a-l prezenta asociației." },
      { nl: true },
      { nl: true },
      { bold: "Timp de procesare:", text: " de obicei 24-48 ore de la trimiterea dosarului." },
    ],
  },
  {
    id: 7,
    icon: "🔒",
    title: "Confidențialitate și GDPR",
    color: "blue",
    summary: "Cum sunt prelucrate și protejate datele tale",
    content: [
      { bold: "Operator de date:" }, { text: " Vosmart Cenzorat, office@vosmart.ro" },
      { nl: true }, { nl: true },
      { bold: "Ce date colectăm:" },
      { nl: true },
      { text: "• Datele de identificare ale administratorului (nume, email, telefon, CUI asociație)" },
      { nl: true },
      { text: "• Documentele financiare încărcate (liste de plată, facturi, extrase bancare)" },
      { nl: true },
      { text: "• Date tehnice de utilizare (IP, browser, sesiuni de acces)" },
      { nl: true }, { nl: true },
      { bold: "Temeiul legal:" },
      { nl: true },
      { text: "Prelucrarea se bazează pe " }, { bold: "executarea contractului (Art. 6(1)(b) GDPR)" }, { text: " și " }, { bold: "interesul legitim (Art. 6(1)(f) GDPR)" }, { text: " pentru îmbunătățirea serviciilor." },
      { nl: true }, { nl: true },
      { bold: "Durata stocării:" },
      { nl: true },
      { text: "Datele financiare sunt păstrate " }, { bold: "5 ani" }, { text: " conform obligațiilor legale contabile (Legea 82/1991). Pe durata acestui termen, dreptul la ștergere nu poate fi exercitat față de datele cu relevanță juridică." },
      { nl: true }, { nl: true },
      { bold: "Utilizarea datelor pentru AI:" },
      { nl: true },
      { text: "VoSmart poate utiliza datele în formă " }, { bold: "strict anonimizată și agregată" }, { text: " pentru antrenarea și îmbunătățirea sistemelor de analiză automată, fără posibilitatea identificării persoanelor sau asociațiilor." },
      { nl: true }, { nl: true },
      { bold: "Drepturile tale (GDPR):" },
      { nl: true },
      { text: "Acces · Rectificare · Ștergere (cu limitele legale) · Restricționare · Portabilitate · Opoziție" },
      { nl: true }, { nl: true },
      { bold: "Plângeri:" }, { text: " Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal — www.dataprotection.ro" },
      { nl: true }, { nl: true },
      { text: "Prin înregistrarea în platformă, utilizatorul confirmă că a citit și înțeles prezenta politică de confidențialitate." },
    ],
  },
  {
    id: 8,
    icon: "📜",
    title: "Termeni și condiții de utilizare",
    color: "indigo",
    summary: "Regulile de utilizare a platformei VoSmart Cenzorat",
    content: [
      { bold: "1. Acceptarea termenilor" },
      { nl: true },
      { text: "Utilizarea platformei constituie acceptul expres și necondiționat al prezentelor termeni. Dacă nu ești de acord, nu poți utiliza serviciile VoSmart Cenzorat." },
      { nl: true }, { nl: true },
      { bold: "2. Responsabilitatea utilizatorului" },
      { nl: true },
      { text: "Utilizatorul garantează că documentele încărcate sunt " }, { bold: "autentice, complete și conforme cu realitatea." }, { text: " VoSmart nu verifică autenticitatea documentelor originale și nu răspunde pentru consecințele unor documente false, incomplete sau eronate furnizate de utilizator." },
      { nl: true }, { nl: true },
      { bold: "3. Natura serviciului" },
      { nl: true },
      { text: "Analiza AI este un instrument de sprijin. Raportul final este verificat și asumat de cenzorul autorizat VoSmart. " }, { bold: "Utilizatorul nu poate utiliza rapoartele în afara scopului pentru care au fost emise" }, { text: " și nu le poate prezenta terților ca propria lucrare." },
      { nl: true }, { nl: true },
      { bold: "4. Limitarea răspunderii" },
      { nl: true },
      { text: "Răspunderea totală a VoSmart Cenzorat față de utilizator, indiferent de cauză, este " }, { bold: "limitată la valoarea abonamentului achitat în ultima lună calendaristică." }, { text: " VoSmart nu răspunde pentru daune indirecte, pierderi de profit, amenzi sau sancțiuni aplicate asociației din motive neimputabile VoSmart." },
      { nl: true }, { nl: true },
      { bold: "5. Disponibilitatea serviciului" },
      { nl: true },
      { text: "VoSmart va depune diligențe rezonabile pentru disponibilitatea platformei, fără a garanta funcționarea neîntreruptă. " }, { bold: "Întreruperile planificate, forța majoră sau defecțiunile furnizorilor de infrastructură cloud nu constituie culpa VoSmart" }, { text: " și nu dau dreptul la despăgubiri." },
      { nl: true }, { nl: true },
      { bold: "6. Modificarea serviciului și a prețurilor" },
      { nl: true },
      { text: "VoSmart poate modifica funcționalitățile platformei oricând. Modificările de preț se comunică cu " }, { bold: "30 de zile preaviz" }, { text: " prin email. Continuarea utilizării după data comunicată constituie acceptul noilor tarife." },
      { nl: true }, { nl: true },
      { bold: "7. Suspendarea și rezilierea" },
      { nl: true },
      { text: "VoSmart poate suspenda sau închide contul imediat, fără preaviz și fără restituirea abonamentului, în cazul: utilizării frauduloase, încălcării termenilor, neplății sau la cererea autorităților competente." },
      { nl: true }, { nl: true },
      { bold: "8. Proprietatea intelectuală" },
      { nl: true },
      { text: "Platforma, interfața, algoritmii și metodologia de analiză sunt proprietatea exclusivă a VoSmart Cenzorat. Utilizatorul primește o " }, { bold: "licență limitată, netransferabilă și revocabilă" }, { text: " de utilizare pe durata abonamentului." },
      { nl: true }, { nl: true },
      { bold: "9. Legea aplicabilă și jurisdicția" },
      { nl: true },
      { text: "Prezentele termeni sunt guvernate de " }, { bold: "legea română." }, { text: " Orice litigiu va fi soluționat de instanțele judecătorești competente din " }, { bold: "România" }, { text: ", la sediul VoSmart Cenzorat." },
      { nl: true }, { nl: true },
      { text: "Data ultimei actualizări: Iunie 2026" },
    ],
  },
  {
    id: 6,
    icon: "💳",
    title: "Abonamente și upgrade",
    color: "rose",
    summary: "Pachete disponibile și cum faci upgrade",
    content: [
      { bold: "Pachete disponibile:" },
      { nl: true },
      { nl: true },
      { bold: "Trial", text: " — 1 dosar · 5 documente/dosar — Gratuit" },
      { nl: true },
      { bold: "Starter", text: " — 10 dosare · 30 documente/dosar — 350 lei/lună" },
      { nl: true },
      { bold: "Business", text: " — 25 dosare · 30 documente/dosar — 720 lei/lună" },
      { nl: true },
      { bold: "Professional", text: " — 50 dosare · 30 documente/dosar — 1.390 lei/lună" },
      { nl: true },
      { bold: "Enterprise", text: " — 50+ dosare · 30 documente/dosar — preț personalizat" },
      { nl: true },
      { nl: true },
      { bold: "Suplimentare disponibile:" },
      { nl: true },
      { text: "• Dosar suplimentar (30 documente incluse) — " }, { bold: "40 lei/dosar" },
      { nl: true },
      { text: "• Document suplimentar (peste limita dosarului) — " }, { bold: "1,3 lei/document" },
      { nl: true },
      { nl: true },
      { bold: "Cum faci upgrade:" },
      { nl: true },
      { bold: "1.", text: " Intră în " }, { bold: "Dashboard → Abonament" },
      { nl: true },
      { bold: "2.", text: " Apasă " }, { bold: "\"Activează abonamentul\"" },
      { nl: true },
      { bold: "3.", text: " Completează datele cardului — plata e securizată prin Stripe" },
      { nl: true },
      { nl: true },
      { text: "Pentru suplimentare sau Enterprise contactează: " }, { bold: "office@vosmart.ro" },
    ],
  },
];

const colorMap: Record<string, { border: string; bg: string; icon: string; num: string; glow: string }> = {
  violet:  { border: "border-violet-500/30",  bg: "bg-violet-500/10",  icon: "text-violet-300",  num: "bg-violet-600",  glow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]" },
  cyan:    { border: "border-cyan-500/30",    bg: "bg-cyan-500/10",    icon: "text-cyan-300",    num: "bg-cyan-600",    glow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]" },
  amber:   { border: "border-amber-500/30",   bg: "bg-amber-500/10",   icon: "text-amber-300",   num: "bg-amber-600",   glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]" },
  blue:    { border: "border-blue-500/30",    bg: "bg-blue-500/10",    icon: "text-blue-300",    num: "bg-blue-600",    glow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: "text-emerald-300", num: "bg-emerald-600", glow: "hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]" },
  rose:    { border: "border-rose-500/30",    bg: "bg-rose-500/10",    icon: "text-rose-300",    num: "bg-rose-600",    glow: "hover:shadow-[0_0_40px_rgba(244,63,94,0.15)]" },
  indigo:  { border: "border-indigo-500/30",  bg: "bg-indigo-500/10",  icon: "text-indigo-300",  num: "bg-indigo-600",  glow: "hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]" },
};

type ContentPart = { bold?: string; text?: string; nl?: boolean };

function renderContent(parts: ContentPart[]) {
  return parts.map((part, i) => {
    if (part.nl) return <br key={i} />;
    if (part.bold && part.text) return <span key={i}><strong className="text-white">{part.bold}</strong><span className="text-slate-300">{part.text}</span></span>;
    if (part.bold) return <strong key={i} className="text-white">{part.bold}</strong>;
    return <span key={i} className="text-slate-300">{part.text}</span>;
  });
}

export default function HelpPage() {
  const [openStep, setOpenStep] = useState<number | null>(1);

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.28),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.15),transparent_45%)]" />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(124,58,237,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.035) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={100} height={44}
              priority className="h-auto" style={{ mixBlendMode: "screen", width: "85px" }} />
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">← Înapoi la site</a>
            <a href="/corporate/login" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-emerald-300 font-medium hover:bg-emerald-500/20 transition">
              Intră în cont
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-12 pt-16 sm:px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
            </span>
            Ghid interactiv
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight">
            Ghid de utilizare{" "}
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              VoSmart
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">
            Tot ce trebuie să știi pentru a folosi platforma de audit online
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {steps.map(step => {
            const c = colorMap[step.color];
            const isOpen = openStep === step.id;
            return (
              <div
                key={step.id}
                className={`rounded-2xl border ${c.border} transition-all duration-300 ${isOpen ? c.bg : "bg-white/[0.02] hover:bg-white/[0.04]"} ${c.glow} cursor-pointer`}
                onClick={() => setOpenStep(isOpen ? null : step.id)}
              >
                {/* Header row */}
                <div className="flex items-center gap-4 p-5">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full ${c.num} flex items-center justify-center text-sm font-bold text-white`}>
                    {step.id}
                  </span>
                  <span className={`text-3xl ${c.icon}`}>{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{step.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{step.summary}</p>
                  </div>
                  <span className={`text-slate-500 text-lg transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                    ↓
                  </span>
                </div>

                {/* Expandable content */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/5">
                    <div className="text-sm leading-relaxed pl-12">
                      {renderContent(step.content)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-10 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold mb-2">Gata să începi?</h2>
          <p className="text-slate-400 mb-8">Contul trial este gratuit, fără card bancar.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/corporate"
              className="rounded-xl bg-violet-600 px-8 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)]">
              Înregistrează-te gratuit →
            </a>
            <a href="#contact"
              onClick={e => { e.preventDefault(); window.location.href = "/#contact"; }}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3.5 font-semibold transition hover:bg-white/[0.08]">
              Contactează-ne →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
          <span>© 2026 VoSmart — Platformă de audit asociații</span>
        </div>
      </footer>
    </main>
  );
}
