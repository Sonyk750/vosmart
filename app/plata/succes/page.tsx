import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Plata a intrat",
  description: "Confirmarea plății abonamentului VoSmart.",
  robots: { index: false, follow: false },
};

/**
 * Pagina pe care cade omul dupa ce Stripe ii accepta cardul.
 *
 * NU citeste nimic din Stripe si nu confirma nimic pe cont propriu: adevarul
 * despre plata vine pe webhook, nu din adresa la care s-a intors browserul.
 * Cine copiaza linkul asta si-l deschide direct vede acelasi text, dar in baza
 * nu se schimba nimic.
 */
export default function PlataReusita() {
  return (
    <main className="flex min-h-screen flex-col bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.20),transparent_45%)]" />
      </div>

      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48} className="h-auto" style={{ mixBlendMode: "screen", width: "90px" }} />
          </a>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-16 sm:px-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-emerald-500/25 bg-emerald-500/5 p-8 text-center md:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-3xl text-emerald-300">
            ✓
          </div>
          <h1 className="text-3xl font-bold">Plata a intrat</h1>
          <p className="mt-4 leading-relaxed text-slate-300">
            Abonamentul este activ. Confirmarea și factura pleacă pe emailul completat la plată —
            dacă nu ajung în câteva minute, uită-te și în „Spam”.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">Ce urmează</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300 marker:text-emerald-400">
              <li>Te sunăm în cel mult o zi lucrătoare pentru datele contractului.</li>
              <li>Primești contractul de cenzorat, semnat electronic.</li>
              <li>Îți deschidem contul și încarci primul dosar.</li>
            </ol>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Ai o întrebare până atunci? Scrie la{" "}
            <a href="mailto:office@vosmart.ro" className="text-emerald-300 hover:underline">office@vosmart.ro</a>{" "}
            sau sună la 0756 362 828.
          </p>

          <a href="/" className="mt-8 inline-flex rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold transition hover:bg-white/[0.08]">
            Înapoi la site
          </a>
        </div>
      </section>
    </main>
  );
}
