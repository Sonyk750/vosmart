"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function VerifyContent() {
  const params = useSearchParams();
  const status = params.get("status");

  const states: Record<string, { icon: string; title: string; text: string; color: string; action?: { href: string; label: string } }> = {
    success: {
      icon: "✅",
      title: "Cont activat cu succes!",
      text: "Adresa de email a fost confirmată și contul Trial Gratuit este acum activ. Puteți intra în portal și testa platforma.",
      color: "emerald",
      action: { href: "/corporate/login", label: "Intră în portal →" },
    },
    already: {
      icon: "✓",
      title: "Cont deja activ",
      text: "Adresa de email a fost deja confirmată. Puteți intra direct în portal.",
      color: "cyan",
      action: { href: "/corporate/login", label: "Intră în portal →" },
    },
    expired: {
      icon: "⏰",
      title: "Link expirat",
      text: "Linkul de activare a expirat (valabil 48 de ore). Vă rugăm să vă înregistrați din nou sau să contactați echipa VoSmart.",
      color: "amber",
      action: { href: "/corporate?package=trial", label: "Înregistrare nouă →" },
    },
    invalid: {
      icon: "❌",
      title: "Link invalid",
      text: "Linkul de activare nu este valid. Asigurați-vă că ați copiat corect linkul din email sau contactați echipa VoSmart.",
      color: "red",
      action: { href: "/#contact", label: "Contactați-ne" },
    },
    error: {
      icon: "⚠️",
      title: "Eroare de server",
      text: "A apărut o eroare la activarea contului. Vă rugăm să încercați din nou sau să contactați echipa VoSmart la office@vosmart.ro.",
      color: "red",
      action: { href: "/#contact", label: "Contactați-ne" },
    },
  };

  const state = states[status || ""] || states["invalid"];
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10",
    cyan: "border-cyan-500/30 bg-cyan-500/10",
    amber: "border-amber-500/30 bg-amber-500/10",
    red: "border-red-500/30 bg-red-500/10",
  };
  const btnMap: Record<string, string> = {
    emerald: "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_25px_rgba(52,211,153,0.35)]",
    cyan: "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.35)]",
    amber: "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.35)]",
    red: "bg-violet-600 hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)]",
  };

  return (
    <div className="rounded-3xl border p-10 text-center max-w-md mx-auto mt-20 ${colorMap[state.color]}">
      <div className={`rounded-3xl border p-10 text-center ${colorMap[state.color]}`}>
        <div className="text-6xl mb-5">{state.icon}</div>
        <h2 className="text-2xl font-bold mb-3">{state.title}</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-8">{state.text}</p>
        {state.action && (
          <a href={state.action.href}
            className={`inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-semibold transition ${btnMap[state.color]}`}>
            {state.action.label}
          </a>
        )}
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-slate-500">
            Întrebări?{" "}
            <a href="mailto:office@vosmart.ro" className="text-violet-400 hover:text-violet-300">office@vosmart.ro</a>
            {" "}· 0756 362 828
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-[#050814] text-white px-5 py-16">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.25),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.15),transparent_40%)]" />
      </div>
      <div className="text-center mb-10">
        <a href="/">
          <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48}
            className="h-auto mx-auto" style={{ mixBlendMode:"screen", width:"90px" }} />
        </a>
      </div>
      <Suspense fallback={
        <div className="flex justify-center mt-20">
          <div className="h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      }>
        <VerifyContent />
      </Suspense>
      <div className="text-center mt-8">
        <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition">← Înapoi la site</a>
      </div>
    </main>
  );
}
