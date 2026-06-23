"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";

const PACKAGE_LABELS: Record<string, { name: string; price: string }> = {
  starter:      { name: "Starter",      price: "250" },
  business:     { name: "Business",     price: "500" },
  professional: { name: "Professional", price: "900" },
  enterprise:   { name: "Enterprise",   price: "1.500" },
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [packageKey, setPackageKey] = useState<string>("starter");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Întoarcere din Stripe Checkout (hosted) după plată reușită.
      const params = new URLSearchParams(window.location.search);
      if (params.get("paid") === "1") {
        setDone(true);
        setReady(true);
        return;
      }

      const raw = sessionStorage.getItem("vosmartCheckout");
      if (!raw) { window.location.replace("/corporate"); return; }
      const parsed = JSON.parse(raw);
      if (!parsed.clientSecret) { window.location.replace("/corporate"); return; }
      setClientSecret(parsed.clientSecret);
      setPackageKey(parsed.packageKey || "starter");
      setReady(true);
    } catch {
      window.location.replace("/corporate");
    }
  }, []);

  function handleSuccess() {
    sessionStorage.removeItem("vosmartCheckout");
    setDone(true);
  }

  const pkg = PACKAGE_LABELS[packageKey] || { name: packageKey, price: "—" };

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.32),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.20),transparent_40%)]" />
        <div style={{ position:"absolute",inset:0, backgroundImage:"linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
      </div>

      <header className="border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48}
              className="h-auto" style={{ mixBlendMode:"screen", width:"90px" }} />
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Plată securizată</span>
            <span className="text-xs rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-1">🔒 SSL</span>
          </div>
        </div>
      </header>

      <section className="px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-lg">
          {done ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
              <div className="text-6xl mb-5">✅</div>
              <h2 className="text-2xl font-bold text-emerald-300 mb-3">Plată confirmată!</h2>
              <p className="text-slate-300 mb-2">
                Contul dumneavoastră VoSmart Corporate — <span className="text-white font-semibold">{pkg.name}</span> — va fi activat în câteva minute.
              </p>
              <p className="text-sm text-slate-400 mb-8">Veți primi un email de confirmare la adresa înregistrată.</p>
              <a href="/corporate/login"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)]">
                Intră în portal →
              </a>
            </div>
          ) : !ready ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
                  </span>
                  Pas final — plată abonament
                </div>
                <h1 className="text-3xl font-bold mb-2">Finalizează plata</h1>
                <p className="text-slate-400">Abonamentul va fi activat imediat după confirmare.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pachet ales</p>
                    <p className="text-lg font-bold text-white">{pkg.name}</p>
                    <p className="text-sm text-slate-400">Abonament lunar VoSmart Corporate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{pkg.price}</p>
                    <p className="text-sm text-slate-400">lei/lună</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                <p className="text-sm text-slate-400 mb-5">Introduceți datele cardului pentru a activa abonamentul:</p>
                {clientSecret && (
                  <CardPaymentForm
                    clientSecret={clientSecret}
                    submitLabel={`Plătește ${pkg.price} lei/lună`}
                    onSuccess={handleSuccess}
                  />
                )}
                <p className="mt-4 text-xs text-center text-slate-600">
                  Plată procesată securizat prin Stripe. Datele cardului nu sunt stocate pe serverele noastre.
                </p>
              </div>

              <p className="text-center mt-6 text-xs text-slate-600">
                Probleme? Contactați-ne la{" "}
                <a href="mailto:office@vosmart.ro" className="text-violet-400 hover:text-violet-300">office@vosmart.ro</a>
              </p>
            </>
          )}
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center">
        <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={35}
          className="h-auto mx-auto mb-3" style={{ mixBlendMode:"screen", width:"70px" }} />
        <p className="text-xs text-slate-600">© 2026 VoSmart. Platformă proprietară. Toate drepturile rezervate.</p>
      </footer>
    </main>
  );
}
