"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useCuiAutofill } from "@/app/hooks/useCuiAutofill";

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

function PackageFromQuery({ onPackage }: { onPackage: (pkg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const pkg = searchParams.get("package");
    if (pkg && (PACKAGES.some(p => p.key === pkg) || pkg === "trial")) onPackage(pkg);
  }, [searchParams, onPackage]);
  return null;
}

export default function CorporatePage() {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [selectedPackage, setSelectedPackage] = useState("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [emailError, setEmailError] = useState<string[]>([]);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [companyName, setCompanyName] = useState("");
  const [cui, setCui] = useState("");
  const [regCom, setRegCom] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const cuiStatus = useCuiAutofill(cui, data => {
    setCompanyName(data.denumire);
    if (data.oras || data.strada) {
      setCity(data.oras);
      setStreet(data.strada);
    } else {
      setStreet(data.adresa);
    }
    if (data.telefon && !phone) setPhone(data.telefon);
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare"); return; }
      if (data.role !== "corporate" && data.role !== "admin") {
        setError("Acest cont nu este un cont corporate.");
        return;
      }
      window.location.replace("/corporate/dashboard");
    } catch { setError("Eroare de conexiune"); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/corporate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, cui, regCom, address: [street, city].filter(Boolean).join(", "), phone, name, email, password, package: selectedPackage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare"); return; }

      if (data.isTrial) {
        setIsTrial(true);
        setSuccess(true);
        if (data.emailErrors?.length) setEmailError(data.emailErrors);
        return;
      }

      // Plan plătit: serverul a creat o sesiune Stripe Checkout — mergem direct
      // la pagina de plată găzduită de Stripe. Același link e trimis și pe email.
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setSuccess(true);
    } catch { setError("Eroare de conexiune"); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <Suspense fallback={null}>
        <PackageFromQuery onPackage={setSelectedPackage} />
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
          {success ? (
            isTrial ? (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-10 text-center">
                <div className="text-5xl mb-4">✉️</div>
                <h3 className="text-xl font-bold text-amber-300 mb-2">Verificați emailul!</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Am trimis un email cu link de activare la adresa înregistrată.
                  <strong className="text-white"> Trebuie să confirmați emailul</strong> pentru a activa contul Trial.
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  Linkul este valabil 48 de ore. Verificați și folderul Spam dacă nu găsiți emailul.
                </p>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-left text-sm text-slate-400 space-y-2 mb-6">
                  <p className="font-semibold text-white text-xs uppercase tracking-wider mb-2">Ce urmează:</p>
                  <p>1. Căutați emailul de la <span className="text-amber-300">VoSmart</span> cu subiectul „Confirmați adresa de email"</p>
                  <p>2. Apăsați butonul de activare din email</p>
                  <p>3. Veți fi redirecționat spre portal și puteți intra cu datele create</p>
                </div>
                {emailError.length > 0 && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
                    <p className="text-sm font-semibold text-red-300 mb-1">⚠️ Emailul de verificare nu a putut fi trimis</p>
                    {emailError.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}
                    <p className="text-xs text-slate-400 mt-2">Contactați <a href="mailto:office@vosmart.ro" className="text-violet-400">office@vosmart.ro</a> pentru activare manuală.</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-3">Vrei un plan complet fără limitări trial?</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {PACKAGES.map(p => (
                      <a key={p.key} href={`/corporate?package=${p.key}`}
                        className="text-xs rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 transition">
                        {p.name} — {p.price} lei
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-emerald-300 mb-2">Cerere înregistrată!</h3>
                <p className="text-slate-300 text-sm mb-4">
                  Contul tău corporate este în așteptare. Te vom contacta în maxim 24 ore pentru activare și detalii de plată.
                </p>
                <p className="text-xs text-slate-500">Pachet ales: <strong className="text-white">{PACKAGES.find(p => p.key === selectedPackage)?.name}</strong> — {PACKAGES.find(p => p.key === selectedPackage)?.priceLabel}</p>
              </div>
            )
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-6">
                <button onClick={() => { setTab("register"); setError(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === "register" ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-slate-400 hover:text-white"}`}>
                  Înregistrare
                </button>
                <button onClick={() => { setTab("login"); setError(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === "login" ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-slate-400 hover:text-white"}`}>
                  Autentificare
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

                {tab === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Intră în contul corporate</h3>
                    <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="Email" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Parolă" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    <button type="submit" disabled={loading}
                      className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
                      {loading ? "Se autentifică..." : "Intră în panou"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <h3 className="text-lg font-semibold mb-1">
                      {selectedPackage === "trial" ? "Activează contul Trial Gratuit" : "Înregistrare firmă de cenzorat"}
                    </h3>
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 ${
                      selectedPackage === "trial"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-white/10 bg-black/10"
                    }`}>
                      <span className="text-xs text-slate-400">Pachet ales:</span>
                      <span className={`text-sm font-semibold ${selectedPackage === "trial" ? "text-amber-300" : "text-violet-300"}`}>
                        {selectedPackage === "trial"
                          ? "Trial Gratuit — 0 lei"
                          : `${PACKAGES.find(p => p.key === selectedPackage)?.name} — ${PACKAGES.find(p => p.key === selectedPackage)?.priceLabel}`}
                      </span>
                    </div>

                    <div className="border-b border-white/5 pb-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Date firmă</p>
                      <div className="space-y-3">
                        <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                          placeholder="Numele firmei de cenzorat *" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <div>
                          <input type="text" value={cui} onChange={e => setCui(e.target.value)}
                            placeholder="CUI / Cod fiscal" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                          {cuiStatus === "loading" && <p className="mt-1.5 text-xs text-slate-500">Se caută firma după CUI...</p>}
                          {cuiStatus === "found" && <p className="mt-1.5 text-xs text-emerald-400">Date completate automat din ANAF</p>}
                          {cuiStatus === "notfound" && <p className="mt-1.5 text-xs text-slate-500">Firma nu a fost găsită în ANAF — completează manual</p>}
                        </div>
                        {selectedPackage !== "trial" && (
                          <input type="text" value={regCom} onChange={e => setRegCom(e.target.value)}
                            placeholder="Nr. Reg. Com. (ex: J40/1234/2020)"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        )}
                        <input type="text" value={city} onChange={e => setCity(e.target.value)}
                          placeholder="Oraș" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                          placeholder="Stradă și număr" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="Telefon" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      </div>
                    </div>

                    {selectedPackage !== "trial" && (
                      <div className="border-b border-white/5 pb-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Date facturare</p>
                        <p className="text-xs text-slate-600 mb-3">Folosite pe factura emisă după confirmare plată</p>
                        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3 text-xs text-slate-400 space-y-1">
                          <p>✓ <strong className="text-slate-300">Firmă:</strong> {companyName || "—"}</p>
                          {cui && <p>✓ <strong className="text-slate-300">CUI:</strong> {cui}</p>}
                          {regCom && <p>✓ <strong className="text-slate-300">Reg. Com.:</strong> {regCom}</p>}
                          {(city || street) && <p>✓ <strong className="text-slate-300">Adresă:</strong> {[street, city].filter(Boolean).join(", ")}</p>}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Date cont</p>
                      <div className="space-y-3">
                        <input type="text" required value={name} onChange={e => setName(e.target.value)}
                          placeholder="Numele dvs. *" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="Email *" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="Parolă (minim 8 caractere) *" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className={`w-full rounded-xl px-6 py-4 font-semibold transition disabled:opacity-50 ${
                        selectedPackage === "trial"
                          ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                          : "bg-violet-600 hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)]"
                      }`}>
                      {loading
                        ? "Se procesează..."
                        : selectedPackage === "trial"
                          ? "Activează Trial Gratuit →"
                          : selectedPackage === "enterprise"
                            ? "Trimite cererea →"
                            : "Continuă spre plată →"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={35}
          className="h-auto mx-auto mb-3" style={{ mixBlendMode:"screen", width:"70px" }} />
        <p className="text-xs text-slate-600">© 2026 VoSmart. Platformă proprietară. Toate drepturile rezervate.</p>
      </footer>
    </main>
  );
}
