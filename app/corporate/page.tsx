"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";

const PACKAGES = [
  {
    key: "starter",
    name: "Starter",
    price: "250",
    assoc: "1 – 5 asociații",
    max: 5,
    color: "cyan",
    features: ["Până la 5 asociații cliente", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Suport email"],
  },
  {
    key: "business",
    name: "Business",
    price: "500",
    assoc: "5 – 15 asociații",
    max: 15,
    color: "violet",
    recommended: true,
    features: ["Până la 15 asociații cliente", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Suport prioritar"],
  },
  {
    key: "professional",
    name: "Professional",
    price: "900",
    assoc: "15 – 50 asociații",
    max: 50,
    color: "cyan",
    features: ["Până la 50 asociații cliente", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Cenzori multipli", "Suport dedicat"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "1500",
    assoc: "50+ asociații",
    max: 9999,
    color: "violet",
    features: ["Asociații nelimitate", "Analiză AI documente", "Rapoarte automate", "Portal clienți dedicat", "Logo propriu în portal", "Cenzori multipli", "API access", "Manager de cont dedicat"],
  },
];

function PackageFromQuery({ onPackage }: { onPackage: (pkg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const pkg = searchParams.get("package");
    if (pkg && PACKAGES.some(p => p.key === pkg)) onPackage(pkg);
  }, [searchParams, onPackage]);
  return null;
}

export default function CorporatePage() {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [selectedPackage, setSelectedPackage] = useState("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [companyName, setCompanyName] = useState("");
  const [cui, setCui] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

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
      if (data.role !== "corporate") {
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
        body: JSON.stringify({ companyName, cui, address, phone, name, email, password, package: selectedPackage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare"); return; }
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setSuccess(true);
      }
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

      {/* Pachete */}
      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold text-center mb-3">Alege pachetul potrivit</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Prețuri lunare, fără contract pe termen lung</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PACKAGES.map(pkg => (
              <div key={pkg.key}
                onClick={() => setSelectedPackage(pkg.key)}
                className={`relative rounded-3xl border p-6 cursor-pointer transition hover:-translate-y-1 ${selectedPackage === pkg.key
                  ? pkg.color === "violet" ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_40px_rgba(124,58,237,0.25)]"
                  : "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.20)]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold shadow-[0_0_15px_rgba(124,58,237,0.5)]">
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
                  <span className="text-3xl font-bold">{pkg.price}</span>
                  <span className="text-slate-400 text-sm"> lei/lună</span>
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
          {paymentDone ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-emerald-300 mb-2">Cont creat și plată confirmată!</h3>
              <p className="text-slate-300 text-sm mb-6">
                Activarea contului poate dura câteva minute. Te poți autentifica din portalul corporate.
              </p>
              <a href="/corporate/login"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)]">
                Intră în portal →
              </a>
            </div>
          ) : clientSecret ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <h3 className="text-lg font-semibold mb-1">Finalizează plata</h3>
              <p className="text-xs text-slate-500 mb-4">
                Pachet ales: <span className="text-violet-300 font-medium">{PACKAGES.find(p => p.key === selectedPackage)?.name} — {PACKAGES.find(p => p.key === selectedPackage)?.price} lei/lună</span>
              </p>
              <CardPaymentForm
                clientSecret={clientSecret}
                submitLabel={`Plătește ${PACKAGES.find(p => p.key === selectedPackage)?.price} lei`}
                onSuccess={() => { setClientSecret(null); setPaymentDone(true); }}
              />
            </div>
          ) : success ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-emerald-300 mb-2">Cerere trimisă cu succes!</h3>
              <p className="text-slate-300 text-sm mb-4">
                Contul tău corporate este în așteptare. Te vom contacta în maxim 24 ore pentru activare și detalii de plată.
              </p>
              <p className="text-xs text-slate-500">Pachet ales: <strong className="text-white">{PACKAGES.find(p => p.key === selectedPackage)?.name}</strong> — {PACKAGES.find(p => p.key === selectedPackage)?.price} lei/lună</p>
            </div>
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
                    <h3 className="text-lg font-semibold mb-1">Înregistrare firmă de cenzorat</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Pachet ales: <span className="text-violet-300 font-medium">{PACKAGES.find(p => p.key === selectedPackage)?.name} — {PACKAGES.find(p => p.key === selectedPackage)?.price} lei/lună</span>
                    </p>

                    <div className="border-b border-white/5 pb-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Date firmă</p>
                      <div className="space-y-3">
                        <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                          placeholder="Numele firmei de cenzorat *" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="text" value={cui} onChange={e => setCui(e.target.value)}
                          placeholder="CUI / Cod fiscal" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                          placeholder="Adresa firmei" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="Telefon" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      </div>
                    </div>

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
                      className="w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)] disabled:opacity-50">
                      {loading ? "Se procesează..." : "Continuă spre plată →"}
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
