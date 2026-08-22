"use client";
import { useState } from "react";

/**
 * Cererea de ofertă de pe pagina de prezentare.
 *
 * Înlocuiește vechea înscriere cu pachet și plată: contractele de cenzorat se
 * semnează între noi și asociație, nu se cumpără dintr-un formular. Mesajul
 * ajunge pe email prin `/api/contact`, ruta care exista deja și care are
 * limitare de frecvență.
 */
export default function FormularOferta({ pachet }: { pachet: string }) {
  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [detalii, setDetalii] = useState("");
  const [trimite, setTrimite] = useState(false);
  const [gata, setGata] = useState(false);
  const [eroare, setEroare] = useState("");

  const camp =
    "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-500";

  async function trimiteCererea(e: React.FormEvent) {
    e.preventDefault();
    setTrimite(true);
    setEroare("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nume, email, telefon,
          mesaj: `Cerere de ofertă — pachet ${pachet}.\n\n${detalii}`,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Cererea nu a putut fi trimisă.");
      setGata(true);
    } catch (err) {
      setEroare(err instanceof Error ? err.message : "Cererea nu a putut fi trimisă.");
    } finally {
      setTrimite(false);
    }
  }

  if (gata) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="font-semibold text-emerald-300">Cererea a plecat.</p>
        <p className="mt-1.5 text-sm text-slate-300">
          Îți răspundem în cel mult o zi lucrătoare, pe {email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={trimiteCererea} className="mt-5 space-y-3">
      {eroare && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{eroare}</p>
      )}
      <input value={nume} onChange={e => setNume(e.target.value)} required
        placeholder="Nume și prenume" className={camp} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={email} onChange={e => setEmail(e.target.value)} required type="email"
          placeholder="Email" className={camp} />
        <input value={telefon} onChange={e => setTelefon(e.target.value)} type="tel"
          placeholder="Telefon" className={camp} />
      </div>
      <textarea value={detalii} onChange={e => setDetalii(e.target.value)} rows={3}
        placeholder="Câte asociații aveți în portofoliu și ce v-ar ajuta cel mai mult?"
        className={`${camp} resize-y`} />
      <button type="submit" disabled={trimite}
        className="w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
        {trimite ? "Se trimite…" : "Trimite cererea →"}
      </button>
    </form>
  );
}
