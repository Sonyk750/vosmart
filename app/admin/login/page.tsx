"use client";
import { useState } from "react";
import Image from "next/image";

export default function AdminLogin() {
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
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare"); return; }
      window.location.href = "/admin";
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
          <Image src="/logo-vosmart.png" alt="VoSmart" width={140} height={60}
            className="h-auto mx-auto" style={{ mixBlendMode: "screen", width: "120px" }} />
          <p className="mt-4 text-slate-400">Panou administrare intern</p>
          <span className="inline-block mt-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-300">Admin / Cenzor</span>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Parolă</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
              {loading ? "Se autentifică..." : "Intră în panou"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
