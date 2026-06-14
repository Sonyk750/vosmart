"use client";
import { useState } from "react";
import Image from "next/image";

export default function CorporateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) { setError(data.error || "Eroare"); return; }
      if (data.role !== "corporate") {
        setError("Acest cont nu este un cont corporate. Contactați VoSmart pentru acces.");
        return;
      }
      window.location.replace("/corporate/dashboard");
    } catch {
      setError("Eroare de conexiune");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(52,211,153,0.20),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.15),transparent_40%)]" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={130} height={56}
              className="h-auto mx-auto" style={{ mixBlendMode:"screen", width:"110px" }} />
          </a>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Portal Corporate — Firme de cenzorat
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-1">Autentificare cont corporate</h2>
          <p className="text-sm text-slate-400 mb-6">Accesul este disponibil doar pentru firme înregistrate și activate.</p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@firmata.ro"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Parolă</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold transition hover:bg-emerald-500 shadow-[0_0_25px_rgba(52,211,153,0.35)] disabled:opacity-50">
              {loading ? "Se autentifică..." : "Intră în portal →"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/5 pt-6 text-center">
            <p className="text-xs text-slate-500">Nu ai cont corporate? Contactează VoSmart pentru înregistrare.</p>
            <a href="/#corporate" className="mt-2 inline-block text-sm text-emerald-400 hover:text-emerald-300 transition">
              Vezi pachetele disponibile →
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition">← Înapoi la site</a>
        </div>
      </div>
    </main>
  );
}
