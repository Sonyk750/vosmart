"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  MAX_APARTAMENTE,
  MIN_APARTAMENTE,
  PACHETE_ASOCIATIE,
  PACHETE_CORPORATE,
  costLunar,
  estePachetAsociatie,
  scrieLei,
  type Pachet,
} from "@/lib/preturi";

/** Pachetele in ordinea de pe site, cu explicatia scurta de pe card. */
const LISTA: { cheie: Pachet; grup: string; detaliu: string }[] = [
  { cheie: "smart", grup: "Cenzorat asociație", detaliu: `${scrieLei(PACHETE_ASOCIATIE.smart.leiPeApartament)} lei / apartament / lună` },
  { cheie: "premium", grup: "Cenzorat asociație", detaliu: `${scrieLei(PACHETE_ASOCIATIE.premium.leiPeApartament)} lei / apartament / lună` },
  { cheie: "starter", grup: "Corporate", detaliu: `${scrieLei(PACHETE_CORPORATE.starter.leiPeLuna)} lei/lună · ${PACHETE_CORPORATE.starter.dosare} dosare` },
  { cheie: "business", grup: "Corporate", detaliu: `${scrieLei(PACHETE_CORPORATE.business.leiPeLuna)} lei/lună · ${PACHETE_CORPORATE.business.dosare} dosare` },
  { cheie: "professional", grup: "Corporate", detaliu: `${scrieLei(PACHETE_CORPORATE.professional.leiPeLuna)} lei/lună · ${PACHETE_CORPORATE.professional.dosare} dosare` },
];

function numePachet(p: Pachet): string {
  return estePachetAsociatie(p) ? PACHETE_ASOCIATIE[p].nume : PACHETE_CORPORATE[p].nume;
}

export default function PlataClient() {
  const [pachet, setPachet] = useState<Pachet>("business");
  const [anulat, setAnulat] = useState(false);
  const [apartamente, setApartamente] = useState("");
  const [denumire, setDenumire] = useState("");
  const [cui, setCui] = useState("");
  const [persoana, setPersoana] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [pleaca, setPleaca] = useState(false);
  const [eroare, setEroare] = useState("");

  // Pachetul si semnalul de anulare vin din adresa. Le citim o singura data, la
  // deschidere: `useSearchParams` ar cere Suspense in jurul intregii pagini.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cerut = p.get("pachet");
    if (cerut && LISTA.some(x => x.cheie === cerut)) setPachet(cerut as Pachet);
    setAnulat(p.get("anulat") === "1");
  }, []);

  const perApartament = estePachetAsociatie(pachet);
  const nrApartamente = Math.trunc(Number(apartamente)) || 0;
  const total = perApartament
    ? (nrApartamente >= MIN_APARTAMENTE ? costLunar(pachet, nrApartamente).lei : null)
    : costLunar(pachet, 0).lei;

  const camp =
    "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-500";

  async function plateste(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    setPleaca(true);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pachet, denumire, cui, persoana, email, telefon, apartamente: nrApartamente }),
      });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Plata nu a putut fi pornită.");
      // Pagina de card e a lui Stripe; de aici incolo nu mai atingem nimic.
      window.location.href = d.url;
    } catch (err) {
      setEroare(err instanceof Error ? err.message : "Plata nu a putut fi pornită.");
      setPleaca(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.30),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.18),transparent_40%)]" />
      </div>

      <header className="border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48} className="h-auto" style={{ mixBlendMode: "screen", width: "90px" }} />
          </a>
          <a href="/" className="text-sm text-slate-400 transition hover:text-white">← Înapoi la site</a>
        </div>
      </header>

      <section className="px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold md:text-4xl">Plata abonamentului</h1>
          <p className="mt-3 text-slate-400">
            Alege pachetul, completează datele de facturare și plătești cu cardul pe pagina securizată Stripe.
            Datele cardului nu trec prin serverele VoSmart.
          </p>

          {anulat && (
            <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Plata a fost întreruptă. Nu s-a reținut nimic de pe card — poți relua oricând.
            </p>
          )}

          <form onSubmit={plateste} className="mt-8 space-y-8">
            {/* Pachetul */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">Pachetul</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {LISTA.map(p => (
                  <button key={p.cheie} type="button" onClick={() => setPachet(p.cheie)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      pachet === p.cheie
                        ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.20)]"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{p.grup}</p>
                    <p className="mt-1 font-semibold">{numePachet(p.cheie)}</p>
                    <p className="mt-1 text-sm text-slate-400">{p.detaliu}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Trialul e gratuit, iar Enterprise are preț personalizat — pentru ele scrie-ne din{" "}
                <a href="/corporate" className="text-violet-300 hover:underline">pagina Corporate</a>.
              </p>
            </div>

            {/* Datele de facturare */}
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Datele de facturare</p>
              <input value={denumire} onChange={e => setDenumire(e.target.value)} required
                placeholder={perApartament ? "Denumirea asociației de proprietari" : "Denumirea firmei"} className={camp} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={cui} onChange={e => setCui(e.target.value)} placeholder="CUI" className={camp} />
                <input value={persoana} onChange={e => setPersoana(e.target.value)} placeholder="Persoană de contact" className={camp} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={email} onChange={e => setEmail(e.target.value)} required type="email"
                  placeholder="Email (aici pleacă factura)" className={camp} />
                <input value={telefon} onChange={e => setTelefon(e.target.value)} type="tel" placeholder="Telefon" className={camp} />
              </div>
              {perApartament && (
                <input value={apartamente} onChange={e => setApartamente(e.target.value.replace(/\D/g, ""))}
                  required inputMode="numeric" placeholder="Câte apartamente are asociația" className={camp} />
              )}
            </div>

            {/* Totalul */}
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">De plată lunar</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {numePachet(pachet)}
                    {perApartament && nrApartamente > 0 && ` · ${nrApartamente} apartamente`}
                  </p>
                </div>
                <p className="text-3xl font-bold text-cyan-300">
                  {total === null ? "—" : `${scrieLei(total)} lei`}
                </p>
              </div>
              {perApartament && (
                <p className="mt-3 text-xs text-slate-500">
                  Între {MIN_APARTAMENTE} și {MAX_APARTAMENTE} apartamente. Abonamentul se reînnoiește lunar
                  și se poate opri oricând.
                </p>
              )}
            </div>

            {eroare && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{eroare}</p>
            )}

            <button type="submit" disabled={pleaca || total === null}
              className="w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
              {pleaca ? "Se deschide pagina de plată…" : "Plătește cu cardul →"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Preferi contract fără plată online?{" "}
              <a href="/corporate" className="text-violet-300 hover:underline">Cere o ofertă</a>.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
