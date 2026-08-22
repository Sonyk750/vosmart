"use client";
import { useState } from "react";
import Image from "next/image";
import { acasaDupaRol } from "@/lib/rute";
import { CardParolaNoua } from "@/app/components/CardParolaNoua";

export default function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vedeParola, setVedeParola] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cardul de parola noua. Se deschide DUPA ce codul a plecat pe email, ca omul
  // sa nu vada opt casute goale fara sa fi primit nimic.
  const [cardParola, setCardParola] = useState<string | null>(null);
  const [trimiteCod, setTrimiteCod] = useState(false);

  // Fara adresa n-avem unde trimite codul, deci butonul sta stins.
  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  async function deschideCard(titlu: string) {
    if (!emailValid || trimiteCod) return;
    setError("");
    setTrimiteCod(true);
    try {
      const res = await fetch("/api/auth/parola-uitata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Nu am putut trimite codul.");
      setCardParola(titlu);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu am putut trimite codul.");
    } finally {
      setTrimiteCod(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Eroare la autentificare");
        setLoading(false);
        return;
      }
      // Destinatia o da rolul, nu pagina de pe care s-a intrat: acelasi formular
      // duce cenzorul in panoul intern si firma in portalul corporate.
      window.location.replace(next ?? acasaDupaRol(data.role));
    } catch {
      setError("Eroare de conexiune");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.32),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.20),transparent_40%)]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={140} height={60}
              className="h-auto mx-auto" style={{ mixBlendMode: "screen", width: "120px" }} />
          </a>
          <p className="mt-4 text-slate-400">Autentificare în platformă</p>
          <p className="mt-1 text-xs text-slate-500">Conturi corporate, colegi și echipa VoSmart — același loc.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@firmata.ro"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Parolă</label>
              {/* Ochiul arata ce s-a tastat: pe telefon, o parola lunga gresita la
                  un singur caracter se soldeaza altfel cu „parolă incorectă". */}
              <div className="relative">
                <input type={vedeParola ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                <button type="button" onClick={() => setVedeParola(v => !v)}
                  aria-label={vedeParola ? "Ascunde parola" : "Arată parola"}
                  aria-pressed={vedeParola}
                  title={vedeParola ? "Ascunde parola" : "Arată parola"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-base text-slate-400 transition hover:bg-white/10 hover:text-white">
                  {vedeParola ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
              {loading ? "Se autentifică..." : "Intră în cont"}
            </button>

            {/* Ambele duc in acelasi loc — difera doar de unde vine omul: unul si-a
                uitat parola, celalalt vrea pur si simplu alta. Tot pe email se
                confirma, pentru ca a doua oara nu stim daca e chiar el. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => deschideCard("Ți-ai uitat parola?")}
                disabled={!emailValid || trimiteCod}
                title={emailValid ? "Primești un cod pe email" : "Completează întâi adresa de email"}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-slate-300">
                {trimiteCod ? "Se trimite..." : "Am uitat parola"}
              </button>
              <button type="button" onClick={() => deschideCard("Schimbă parola")}
                disabled={!emailValid || trimiteCod}
                title={emailValid ? "Primești un cod pe email" : "Completează întâi adresa de email"}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-slate-300">
                {trimiteCod ? "Se trimite..." : "Schimbă parola"}
              </button>
            </div>

            {/* Fara adresa butoanele stau stinse — scriem de ce, altfel omul apasa
                degeaba si crede ca s-a stricat pagina. */}
            <p className="text-center text-xs text-slate-500">
              {emailValid
                ? "Apasă un buton și îți trimitem pe email un cod din 8 caractere."
                : "Scrie-ți întâi adresa de email în căsuța de sus, ca să poți apăsa butoanele."}
            </p>
          </form>

          <div className="mt-6 border-t border-white/5 pt-6 text-center">
            <p className="text-xs text-slate-500">Nu ai cont corporate?</p>
            <a href="/corporate" className="mt-2 inline-block text-sm text-emerald-400 transition hover:text-emerald-300">
              Înregistrează firma de cenzorat →
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 transition hover:text-slate-300">← Înapoi la site</a>
        </div>
      </div>

      {cardParola && (
        <CardParolaNoua email={email.trim()} titlu={cardParola} onInchide={() => setCardParola(null)} />
      )}
    </main>
  );
}
