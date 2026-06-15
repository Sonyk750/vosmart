"use client";
import { useState } from "react";
import Image from "next/image";
import { useCuiAutofill } from "@/app/hooks/useCuiAutofill";

export default function ClientiPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAssocName, setRegAssocName] = useState("");
  const [regCUI, setRegCUI] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPackage, setRegPackage] = useState("smart");

  const cuiStatus = useCuiAutofill(regCUI, data => {
    setRegAssocName(data.denumire);
    if (data.oras || data.strada) {
      setRegCity(data.oras);
      setRegStreet(data.strada);
    } else {
      setRegStreet(data.adresa);
    }
    if (data.telefon && !regPhone) setRegPhone(data.telefon);
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
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare la autentificare"); return; }
      if (data.role === "admin" || data.role === "cenzor") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("Conturile de admin și cenzor folosesc formularul dedicat.");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Eroare de conexiune");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName, email: regEmail, password: regPassword,
          associationName: regAssocName, cui: regCUI,
          address: [regStreet, regCity].filter(Boolean).join(", "), phone: regPhone, package: regPackage,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare la înregistrare"); return; }
      window.location.href = "/dashboard";
    } catch {
      setError("Eroare de conexiune");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.32),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.20),transparent_40%)]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={160} height={70}
              className="h-auto mx-auto" style={{ mixBlendMode: "screen", width: "140px" }} />
          </a>
          <p className="mt-4 text-slate-400">Portal clienți VoSmart</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-6">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === "login" ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-slate-400 hover:text-white"}`}
          >
            Autentificare
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === "register" ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-slate-400 hover:text-white"}`}
          >
            Creare cont
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Email</label>
                <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="email@exemplu.ro"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Parolă</label>
                <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)] disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? "Se autentifică..." : "Intră în cont"}
              </button>
              <p className="text-center text-sm text-slate-500 mt-2">
                Nu ai cont?{" "}
                <button type="button" onClick={() => setTab("register")} className="text-violet-400 hover:text-violet-300">
                  Creează unul
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                Contul va fi verificat de administratorul VoSmart. Vei putea intra in cont dupa aprobare.
              </div>
              <p className="text-sm text-slate-400 mb-2">Date personale</p>
              <input type="text" required value={regName} onChange={e => setRegName(e.target.value)}
                placeholder="Nume complet"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
              <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
              <input type="password" required minLength={8} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                placeholder="Parolă (minim 8 caractere)"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />

              <div className="border-t border-white/5 pt-4">
                <p className="text-sm text-slate-400 mb-3">Date asociație</p>
                <div className="space-y-4">
                  <input type="text" required value={regAssocName} onChange={e => setRegAssocName(e.target.value)}
                    placeholder="Numele asociației"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <div>
                    <input type="text" value={regCUI} onChange={e => setRegCUI(e.target.value)}
                      placeholder="CUI / Cod fiscal"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    {cuiStatus === "loading" && <p className="mt-1.5 text-xs text-slate-500">Se caută asociația după CUI...</p>}
                    {cuiStatus === "found" && <p className="mt-1.5 text-xs text-emerald-400">Date completate automat din ANAF</p>}
                    {cuiStatus === "notfound" && <p className="mt-1.5 text-xs text-slate-500">Nu a fost găsit în ANAF — completează manual</p>}
                  </div>
                  <input type="text" value={regCity} onChange={e => setRegCity(e.target.value)}
                    placeholder="Oraș"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <input type="text" value={regStreet} onChange={e => setRegStreet(e.target.value)}
                    placeholder="Stradă și număr"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                    placeholder="Telefon"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="text-sm text-slate-400 mb-3">Pachet ales</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRegPackage("smart")}
                    className={`rounded-xl border p-4 text-left transition ${regPackage === "smart" ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <p className="font-semibold text-cyan-300">Smart</p>
                    <p className="text-xs text-slate-400 mt-1">Verificare asistată AI</p>
                  </button>
                  <button type="button" onClick={() => setRegPackage("premium")}
                    className={`rounded-xl border p-4 text-left transition ${regPackage === "premium" ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <p className="font-semibold text-violet-300">Premium</p>
                    <p className="text-xs text-slate-400 mt-1">Cenzorat profesional</p>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Se creează contul..." : "Creează cont"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
