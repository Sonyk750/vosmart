"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import SplashScreen from "./components/SplashScreen";
import { downloadOferta } from "./components/OfertaPDF";

function ContactForm() {
  const [form, setForm] = useState({ nume: "", email: "", telefon: "", mesaj: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setStatus("success")
      setTimeout(() => {
        setStatus("idle")
        setForm({ nume: "", email: "", telefon: "", mesaj: "" })
      }, 4000)
    } else {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-semibold mb-2">Mesaj trimis!</h3>
        <p className="text-slate-400">Te contactăm în cel mai scurt timp la <span className="text-white">{form.email}</span>.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
      <h3 className="mb-6 text-2xl font-semibold">Trimite-ne un mesaj</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text" placeholder="Nume" required
          value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
        <input
          type="email" placeholder="Email" required
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
        <input
          type="text" placeholder="Telefon"
          value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
        <textarea
          rows={5} placeholder="Mesaj" required
          value={form.mesaj} onChange={e => setForm(f => ({ ...f, mesaj: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition resize-none" />
        {status === "error" && (
          <p className="text-red-400 text-sm">Eroare la trimitere. Încearcă din nou sau scrie la office@vosmart.ro.</p>
        )}
        <button
          type="submit" disabled={status === "loading"}
          className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)] disabled:opacity-60">
          {status === "loading" ? "Se trimite..." : "Trimite mesajul"}
        </button>
      </form>
    </div>
  )
}

const services = [
  {
    icon: "📄",
    title: "Cenzorat asociații",
    text: "Servicii profesionale de cenzorat pentru asociații de proprietari, cu verificarea documentelor financiar-contabile.",
    href: "/cenzorat-asociatii",
  },
  {
    icon: "🏢",
    title: "Cenzorat blocuri",
    text: "Control financiar pentru blocuri, condominii și asociații care au nevoie de transparență și rapoarte clare.",
    href: "/cenzorat-asociatii",
  },
  {
    icon: "📊",
    title: "Rapoarte lunare",
    text: "Rapoarte de cenzorat disponibile online pentru asociațiile înrolate în platforma VoSmart.",
    href: "/cenzorat-asociatii#proces",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ce este cenzoratul pentru asociații de proprietari?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cenzoratul presupune verificarea documentelor financiar-contabile ale asociației, a listelor de întreținere, fondurilor și soldurilor.",
      },
    },
    {
      "@type": "Question",
      name: "VoSmart oferă cenzorat pentru blocuri?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. VoSmart oferă servicii de cenzorat pentru blocuri, condominii și asociații de proprietari.",
      },
    },
    {
      "@type": "Question",
      name: "Cum primesc rapoartele de cenzorat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rapoartele pot fi publicate în portalul online al asociației, de unde pot fi descărcate de client.",
      },
    },
    {
      "@type": "Question",
      name: "AI-ul emite raportul final?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Platforma poate genera o analiză preliminară și un draft, iar raportul final este verificat și validat înainte de publicare.",
      },
    },
  ],
};

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splashShown")) {
      setSplashDone(true);
      setSkipAnim(true);
    }
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem("splashShown", "1");
    setSplashDone(true);
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}

      <main
        className="min-h-screen overflow-hidden bg-[#050814] text-white"
        style={{
          opacity: splashDone ? 1 : 0,
          transform: splashDone ? "translateY(0)" : "translateY(16px)",
          transition: skipAnim ? "none" : "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* BACKGROUND */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.32),transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.20),transparent_40%)]" />
          <div style={{
            position:"absolute",inset:0,
            backgroundImage:"linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)",
            backgroundSize:"48px 48px",
          }}/>
        </div>

        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center">
              <Image
                src="/logo-vosmart.png"
                alt="VoSmart"
                width={130}
                height={56}
                priority
                className="h-auto w-[110px]"
              />
            </a>
            <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
              <a href="/platforma-ai-cenzorat" className="transition hover:text-violet-300">Platformă AI</a>
              <a href="#pachete" className="transition hover:text-violet-300">Pachete</a>
              <a href="#servicii" className="transition hover:text-violet-300">Servicii</a>
              <a href="/corporate/login" className="transition hover:text-emerald-200 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-300 font-medium">Corporate</a>
              <a href="/blog" className="transition hover:text-emerald-300">Blog</a>
              <a href="/help" className="transition hover:text-cyan-300">Ajutor</a>
              <a href="#contact" className="transition hover:text-violet-300">Contact</a>
              <a href="/admin/login" className="transition hover:text-violet-200 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-violet-300 font-medium">Admin</a>
            </nav>
            <a href="#contact" className="hidden rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold shadow-[0_0_25px_rgba(124,58,237,0.4)] transition hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(124,58,237,0.6)] md:inline-flex">Solicită ofertă</a>
            <a href="#contact" className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold md:hidden">Contact</a>
          </div>
          <nav className="flex justify-center gap-5 border-t border-white/5 px-4 py-3 text-xs text-slate-300 md:hidden">
            <a href="/platforma-ai-cenzorat" className="hover:text-white">Platformă AI</a>
            <a href="#pachete" className="hover:text-white">Pachete</a>
            <a href="#servicii" className="hover:text-white">Servicii</a>
            <a href="/help" className="hover:text-cyan-300 text-cyan-400">Ajutor</a>
            <a href="/corporate/login" className="hover:text-emerald-200 text-emerald-300 border border-emerald-500/30 rounded-lg px-2 py-0.5">Corporate</a>
            <a href="/admin/login" className="hover:text-violet-200 text-violet-300 border border-violet-500/30 rounded-lg px-2 py-0.5">Admin</a>
          </nav>
        </header>

        {/* HERO */}
        <section className="relative px-5 pb-20 pt-20 sm:px-6 lg:pb-32 lg:pt-32">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[1px] w-2/3" style={{boxShadow:"0 0 180px 60px rgba(124,58,237,0.15)"}}/>
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
                </span>
                Firmă de cenzorat · Portal online · Rapoarte lunare
              </div>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Firmă de cenzorat pentru{" "}
                <span style={{background:"linear-gradient(135deg,#a78bfa,#67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                  asociații de proprietari
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
                VoSmart oferă servicii profesionale de cenzorat asociații, cenzorat blocuri și verificare financiară, într-un format modern: rapoarte lunare, documente și observații disponibile online.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["✓ Rapoarte în 60 min","✓ Portal 24/7","✓ AI + Expert uman"].map((b)=>(
                  <span key={b} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-300">{b}</span>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="#contact" className="group relative overflow-hidden rounded-xl bg-violet-600 px-7 py-4 text-center font-semibold shadow-[0_0_35px_rgba(124,58,237,0.5)] transition hover:shadow-[0_0_50px_rgba(124,58,237,0.7)]">
                  <span className="relative z-10">Solicită ofertă →</span>
                </a>
                <a href="#pachete" className="rounded-xl border border-white/10 bg-white/[0.03] px-7 py-4 text-center font-semibold transition hover:bg-white/[0.08] hover:border-white/20">
                  Vezi pachetele
                </a>
              </div>
            </div>

            {/* Dashboard card */}
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_90px_rgba(124,58,237,0.25)] backdrop-blur-sm">
              <div className="pointer-events-none absolute -top-px left-1/2 h-[1px] w-3/4 -translate-x-1/2" style={{background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.6),transparent)"}}/>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">VoSmart Portal</p>
                  <h2 className="text-xl font-semibold">Asociația de Proprietari</h2>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Activ
                </span>
              </div>
              {[
                ["Portal client","Rapoarte lunare disponibile online","98%","violet"],
                ["Documente","Arhivă digitală pentru asociație","24/7","cyan"],
                ["Observații","Recomandări și verificări clare","AI ready","violet"],
              ].map(([title,text,stat,color])=>(
                <div key={title} className="mb-4 rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:bg-black/35">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{text}</p>
                    </div>
                    <span className={`rounded-xl ${color==="cyan"?"bg-cyan-500/15 text-cyan-300":"bg-violet-500/15 text-violet-300"} px-3 py-2 text-sm`}>{stat}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-5">
                <p className="text-sm text-cyan-200">Ultimul raport disponibil:</p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="font-semibold">Raport cenzor Mai 2026</span>
                  <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]">Descarcă</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="px-5 py-10 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 grid-cols-2 md:grid-cols-4">
            {[["60 min","Timp estimativ raport"],["24/7","Acces portal online"],["AI + Expert","Analiză asistată"],["100%","Arhivă digitală"]].map(([value,label])=>(
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center transition hover:bg-white/[0.06] hover:border-violet-500/30">
                <div className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent">{value}</div>
                <p className="mt-2 text-xs text-slate-500 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PLATFORMĂ */}
        <section id="platforma" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">Platformă VoSmart</p>
              <h2 className="text-3xl font-bold md:text-4xl">
                Cenzorat modern, rapoarte online și{" "}
                <span style={{background:"linear-gradient(90deg,#a78bfa,#67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>transparență totală</span>
              </h2>
              <p className="mt-4 text-slate-400">VoSmart nu este doar o firmă de cenzorat. Este o platformă modernă unde clienții pot accesa rapoarte lunare, documente, observații și recomandări.</p>
              <a href="/platforma-ai-cenzorat" className="mt-6 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-400/15">
                Vezi aplicația AI pentru firme și cenzori →
              </a>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                ["📥","Rapoarte online","Clienții pot descărca lunar rapoartele pentru asociațiile înrolate.","violet"],
                ["🗂️","Arhivă documente","Documentele și observațiile pot fi păstrate într-un singur loc.","cyan"],
                ["🔐","Acces securizat","Portal dedicat pentru președinte, comitet și administrator.","violet"],
              ].map(([icon,title,text,color])=>(
                <div key={title as string} className={`group rounded-3xl border ${color==="cyan"?"border-cyan-500/15 hover:border-cyan-500/30":"border-violet-500/15 hover:border-violet-500/30"} bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:bg-white/[0.06]`}>
                  <div className="mb-5 text-4xl">{icon}</div>
                  <h3 className="mb-3 text-xl font-semibold">{title}</h3>
                  <p className="leading-relaxed text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CORPORATE - înainte de pachete, carduri mai mari */}
        <section id="corporate" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Pentru firme de cenzorat</p>
              <h2 className="text-3xl font-bold md:text-5xl">
                VoSmart{" "}
                <span style={{background:"linear-gradient(135deg,#34d399,#67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                  Corporate
                </span>
              </h2>
              <p className="mt-4 text-slate-400 text-lg">Oferă clienților tăi un portal modern cu analiză AI. Gestionează toate asociațiile dintr-un singur panou.</p>
            </div>

            {/* Trial card */}
            <a href="/corporate?package=trial"
              className="block mb-6 rounded-[2rem] border border-amber-500/25 bg-amber-500/5 p-6 md:p-8 transition hover:-translate-y-1 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_0_50px_rgba(245,158,11,0.15)]">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Trial Gratuit
                    </span>
                    <span className="text-xs text-slate-500">Fără card, fără angajament</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">Încearcă VoSmart Corporate</h3>
                  <p className="text-slate-400 text-sm">Testați platforma fără costuri — 1 asociație, 1 upload, 1 raport AI generat.</p>
                </div>
                <div className="flex gap-8 text-center">
                  {[["1","asociație"],["1","upload"],["1","raport AI"]].map(([v,l])=>(
                    <div key={l}><p className="text-2xl font-bold text-amber-300">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
                  ))}
                </div>
                <div className="md:text-right shrink-0">
                  <p className="text-3xl font-bold text-amber-300">0 lei</p>
                  <span className="mt-2 inline-flex rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 transition">
                    Încearcă gratuit →
                  </span>
                </div>
              </div>
            </a>

            <p className="text-center text-xs text-slate-600 uppercase tracking-widest mb-6">sau alege un plan complet</p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
              {[
                { key:"starter", name:"Starter", price:"350", assoc:"10 dosare · 30 doc/dosar", color:"cyan", features:["10 dosare/lună","30 documente/dosar","Portal clienți dedicat","Analiză AI documente","Rapoarte automate","Suport email","Dosare suplimentare (40 lei)"] },
                { key:"business", name:"Business", price:"720", assoc:"25 dosare · 30 doc/dosar", color:"emerald", recommended:true, features:["25 dosare/lună","30 documente/dosar","Portal clienți dedicat","Analiză AI documente","Rapoarte automate","Logo propriu în portal","Cenzori multipli","Suport prioritar"] },
                { key:"professional", name:"Professional", price:"1.390", assoc:"50 dosare · 30 doc/dosar", color:"cyan", features:["50 dosare/lună","30 documente/dosar","Portal clienți dedicat","Analiză AI documente","Rapoarte automate","Logo propriu în portal","Cenzori multipli","Suport dedicat"] },
                { key:"enterprise", name:"Enterprise", price:"Personalizat", assoc:"50+ dosare · 30 doc/dosar", color:"emerald", features:["Dosare nelimitate","30 documente/dosar","Portal clienți dedicat","Analiză AI documente","Rapoarte automate","Logo propriu în portal","Cenzori multipli","API access","Manager cont dedicat"] },
              ].map((pkg)=>(
                <div key={pkg.name} className={`relative rounded-[2rem] border p-8 transition hover:-translate-y-1
                  ${pkg.color==="emerald"
                    ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-[0_0_60px_rgba(52,211,153,0.10)] hover:shadow-[0_0_80px_rgba(52,211,153,0.18)]"
                    : "border-cyan-500/20 bg-gradient-to-br from-cyan-500/8 to-transparent shadow-[0_0_60px_rgba(6,182,212,0.08)] hover:shadow-[0_0_80px_rgba(6,182,212,0.15)]"}`}>
                  {pkg.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold shadow-[0_0_15px_rgba(52,211,153,0.5)] whitespace-nowrap">
                      Recomandat
                    </div>
                  )}
                  <div className={`mb-5 inline-flex rounded-full border px-4 py-1.5 text-sm font-medium ${pkg.color==="emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>
                    {pkg.name}
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{pkg.price}</span>
                    {pkg.key !== "enterprise" && <span className="text-slate-400"> lei/lună</span>}
                  </div>
                  <p className={`text-sm font-semibold mb-6 ${pkg.color==="emerald" ? "text-emerald-300" : "text-cyan-300"}`}>{pkg.assoc}</p>
                  <ul className="space-y-3 mb-8">
                    {pkg.features.map(f=>(
                      <li key={f} className="flex gap-2.5 text-sm text-slate-300">
                        <span className={`flex-shrink-0 mt-0.5 ${pkg.color==="emerald"?"text-emerald-400":"text-cyan-400"}`}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <a href={`/corporate?package=${pkg.key}`}
                    className={`inline-flex w-full justify-center rounded-xl px-6 py-3.5 font-semibold transition
                      ${pkg.color==="emerald"
                        ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                        : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"}`}>
                    {pkg.key === "enterprise" ? "Solicită ofertă" : `Solicită ${pkg.name}`}
                  </a>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a href="/corporate/login"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 font-semibold transition hover:bg-emerald-500 shadow-[0_0_30px_rgba(52,211,153,0.40)] hover:shadow-[0_0_50px_rgba(52,211,153,0.60)]">
                Accesează portalul corporate →
              </a>
              <p className="mt-3 text-xs text-slate-500">Acces disponibil după activarea contului. <a href="#contact" className="text-emerald-400 hover:text-emerald-300">Contactează-ne</a> pentru înregistrare.</p>
            </div>
          </div>
        </section>

        {/* PACHETE */}
        <section id="pachete" className="px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Servicii de cenzorat la alt nivel</p>
              <h2 className="text-3xl font-bold md:text-5xl">Alege modul de verificare potrivit</h2>
              <p className="mt-5 text-slate-400">VoSmart combină tehnologia digitală cu validarea specialistului, pentru rapoarte rapide, clare și disponibile online.</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Smart */}
              <div className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/8 to-transparent p-8 shadow-[0_0_60px_rgba(6,182,212,0.10)] transition hover:shadow-[0_0_80px_rgba(6,182,212,0.18)]">
                <div className="mb-6 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">VoSmart Smart</div>
                <h3 className="text-3xl font-bold">Verificare asistată digital</h3>
                <p className="mt-4 text-slate-300">Documentele sunt încărcate online, analizate digital, iar raportul preliminar este verificat și validat înainte de publicarea finală.</p>
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-cyan-300">Timp estimativ</p>
                  <p className="mt-2 text-3xl font-bold">30 – 60 min</p>
                  <p className="mt-2 text-sm text-slate-400">de la încărcarea documentelor</p>
                </div>
                <ul className="mt-8 space-y-4 text-slate-300">
                  {["Upload documente online","Analiză asistată digital","Generare draft raport","Verificare finală de specialist","Publicare raport în portal","Potrivit pentru verificări lunare"].map((item)=>(
                    <li key={item} className="flex gap-3"><span className="text-cyan-300 mt-0.5">✓</span><span>{item}</span></li>
                  ))}
                </ul>
                <button onClick={() => downloadOferta('smart')} className="mt-8 inline-flex w-full justify-center items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 font-semibold text-black transition hover:bg-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descarcă oferta Smart PDF
                </button>
              </div>
              {/* Premium */}
              <div className="relative rounded-[2rem] border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-8 shadow-[0_0_80px_rgba(124,58,237,0.18)] transition hover:shadow-[0_0_100px_rgba(124,58,237,0.28)]">
                <div className="pointer-events-none absolute -top-px left-1/4 h-[1px] w-1/2" style={{background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.8),transparent)"}}/>
                <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-xs font-semibold shadow-[0_0_20px_rgba(124,58,237,0.5)]">Recomandat</div>
                <div className="mb-6 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">VoSmart Premium</div>
                <h3 className="text-3xl font-bold">Cenzorat profesional complet</h3>
                <p className="mt-4 text-slate-300">Include verificare aprofundată, observații personalizate, raport oficial și asistență dedicată pentru asociația de proprietari.</p>
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-violet-300">Nivel verificare</p>
                  <p className="mt-2 text-3xl font-bold">Expert</p>
                  <p className="mt-2 text-sm text-slate-400">pentru rapoarte lunare, anuale sau adunări generale</p>
                </div>
                <ul className="mt-8 space-y-4 text-slate-300">
                  {["Tot ce include pachetul Smart","Verificare aprofundată de cenzor uman","Observații și recomandări personalizate","Rapoarte lunare, anuale sau AG","Prioritate la procesare","Asistență dedicată pentru asociație"].map((item)=>(
                    <li key={item} className="flex gap-3"><span className="text-violet-300 mt-0.5">✓</span><span>{item}</span></li>
                  ))}
                </ul>
                <button onClick={() => downloadOferta('premium')} className="mt-8 inline-flex w-full justify-center items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_30px_rgba(124,58,237,0.45)] cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descarcă oferta Premium PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICII */}
        <section id="servicii" className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Servicii</p>
              <h2 className="text-3xl font-bold md:text-4xl">Servicii de cenzorat asociații și cenzorat blocuri</h2>
              <p className="mt-4 max-w-3xl text-slate-400">VoSmart oferă servicii de firmă de cenzorat pentru asociații de proprietari, verificare financiară, control documente și rapoarte periodice.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {services.map((item)=>(
                <Link href={item.href} key={item.title} className="group rounded-3xl border border-white/8 bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:bg-white/[0.07] hover:border-violet-500/20">
                  <div className="mb-5 text-4xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                  <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                  <p className="leading-relaxed text-slate-400">{item.text}</p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-cyan-300 transition-colors group-hover:text-cyan-200">Descoperă serviciul →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CUM LUCRĂM */}
        <section className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-violet-500/8 to-transparent p-8 md:p-12">
            <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">Procesul nostru</div>
            <h2 className="text-3xl font-bold md:text-4xl">Cum lucrăm</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {[
                ["01","Analiză","Discutăm situația asociației.","#7c3aed"],
                ["02","Verificare","Analizăm documentele financiar-contabile.","#06b6d4"],
                ["03","Raport","Întocmim raportul de cenzorat.","#7c3aed"],
                ["04","Portal","Clientul descarcă raportul online.","#06b6d4"],
              ].map(([step,title,text,color])=>(
                <div key={step} className="relative rounded-3xl border border-white/8 bg-black/20 p-6 overflow-hidden group hover:border-white/15 transition">
                  <div className="pointer-events-none absolute top-0 left-0 w-full h-[1px]" style={{background:`linear-gradient(90deg,transparent,${color}40,transparent)`}}/>
                  <span className="text-2xl font-bold" style={{color,opacity:0.5}}>{step}</span>
                  <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Întrebări frecvente</p>
              <h2 className="text-3xl font-bold md:text-4xl">Întrebări despre cenzorat asociații</h2>
            </div>
            <div className="space-y-4">
              {[
                ["Ce este cenzoratul pentru asociații de proprietari?","Cenzoratul presupune verificarea documentelor financiar-contabile ale asociației, a listelor de întreținere, fondurilor și soldurilor."],
                ["VoSmart oferă cenzorat blocuri?","Da. VoSmart oferă servicii de cenzorat pentru blocuri, condominii și asociații de proprietari."],
                ["Cum primesc rapoartele?","Rapoartele pot fi publicate în portalul online al asociației, de unde pot fi descărcate de client."],
                ["AI-ul emite raportul final?","Platforma poate genera o analiză preliminară și un draft, iar raportul final este verificat și validat înainte de publicare."],
              ].map(([question,answer])=>(
                <div key={question} className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 transition hover:bg-white/[0.05]">
                  <h3 className="text-lg font-semibold flex items-start gap-3">
                    <span className="text-violet-400 text-sm mt-1 flex-shrink-0">▸</span>{question}
                  </h3>
                  <p className="mt-3 leading-relaxed text-slate-400 pl-6">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="px-5 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-wider text-violet-400">Contact</p>
              <h2 className="text-4xl font-bold">Contactează VoSmart</h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-400">Ai nevoie de o firmă de cenzorat pentru asociații de proprietari? Trimite-ne un mesaj și îți răspundem rapid.</p>
            </div>
            <div className="mb-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/8 p-6 transition hover:bg-cyan-500/12">
                <div className="mb-4 text-3xl">📞</div>
                <h3 className="mb-2 text-lg font-semibold">Telefon</h3>
                <p className="text-slate-300">0756 362 828</p>
              </div>
              <div className="rounded-3xl border border-violet-500/20 bg-violet-500/8 p-6 transition hover:bg-violet-500/12">
                <div className="mb-4 text-3xl">✉️</div>
                <h3 className="mb-2 text-lg font-semibold">Email</h3>
                <p className="text-slate-300">office@vosmart.ro</p>
              </div>
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/8 p-6 transition hover:bg-emerald-500/12">
                <div className="mb-4 text-3xl">📍</div>
                <h3 className="mb-2 text-lg font-semibold">Adresă</h3>
                <p className="text-slate-300">Constantin Dobrogeanu Gherea 89<br/>Sector 1, București</p>
              </div>
            </div>
            <div className="grid gap-10 lg:grid-cols-2">
              <ContactForm />
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <h3 className="mb-6 text-2xl font-semibold">Locația noastră</h3>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <iframe title="Locație VoSmart" src="https://www.google.com/maps?q=Constantin%20Dobrogeanu%20Gherea%2089%20Sector%201%20Bucuresti&output=embed" className="h-72 w-full border-0" loading="lazy"/>
                </div>
                <div className="mt-6 space-y-4 text-slate-300">
                  <p><strong className="text-white">Adresă:</strong><br/>Str. Constantin Dobrogeanu Gherea 89, Sector 1, București</p>
                  <p><strong className="text-white">Program:</strong><br/>Luni – Vineri: 09:00 – 17:00</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/5 px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-4">
              <div>
                <div className="mb-5">
                  <Image
                    src="/logo-vosmart.png"
                    alt="VoSmart"
                    width={130}
                    height={56}
                    className="h-auto w-[110px]"
                  />
                </div>
                <p className="text-sm leading-relaxed text-slate-500">Platformă modernă pentru cenzorat asociații de proprietari, rapoarte online și verificări financiare.</p>
              </div>
              <div>
                <h3 className="mb-5 font-semibold text-white">Servicii</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  {["Cenzorat asociații","Cenzorat blocuri","Rapoarte lunare","Rapoarte anuale"].map(s=><li key={s}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="mb-5 font-semibold text-white">Platformă</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  {["Portal client","Documente","Arhivă digitală","AI Assistance"].map(s=><li key={s}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="mb-5 font-semibold text-white">Contact</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li>0756 362 828</li><li>office@vosmart.ro</li>
                  <li>Constantin Dobrogeanu Gherea 89<br/>Sector 1, București</li>
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-slate-600 md:flex-row">
              <span>© 2026 VoSmart. Toate drepturile rezervate.</span>
              <span>Firmă de cenzorat pentru asociații de proprietari.</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
