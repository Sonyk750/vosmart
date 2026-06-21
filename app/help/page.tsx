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
    id: 6,
    icon: "💳",
    title: "Abonamente și upgrade",
    color: "rose",
    summary: "Pachete disponibile și cum faci upgrade",
    content: [
      { bold: "Pachete disponibile:" },
      { nl: true },
      { nl: true },
      { bold: "Trial", text: " — 1 dosar (5 documente) — Gratuit" },
      { nl: true },
      { bold: "Starter", text: " — 10 asociații — 250 lei/lună" },
      { nl: true },
      { bold: "Business", text: " — 25 asociații — 500 lei/lună" },
      { nl: true },
      { bold: "Professional", text: " — 50 asociații — 900 lei/lună" },
      { nl: true },
      { nl: true },
      { bold: "Cum faci upgrade:" },
      { nl: true },
      { bold: "1.", text: " Intră în " }, { bold: "Dashboard → Abonament" },
      { nl: true },
      { bold: "2.", text: " Apasă " }, { bold: "\"Activează abonamentul\"" },
      { nl: true },
      { bold: "3.", text: " Completează datele cardului — plata e securizată prin Stripe" },
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
