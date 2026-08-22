"use client";
import { useEffect, useState } from "react";
import { CampCod } from "@/app/components/CampCod";
import { LUNGIME_COD, LUNGIME_MINIMA_PAROLA, parolaValida, REGULA_PAROLA } from "@/lib/parola-cod";

const INPUT =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-violet-500";
const BUTON =
  "w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50";

/**
 * Cardul de parola noua, deschis din pagina de login.
 *
 * Trei faze in acelasi card, si asta e intentionat: omul NU pleaca din pagina.
 * Cere codul, se duce in email, se intoarce si il tasteaza aici, cu adresa lui
 * deja completata. Daca ar fi fost o pagina separata, s-ar fi pierdut adresa si
 * ar fi trebuit sa se intoarca singur la login dupa ce termina.
 *
 *   cod     — cele 8 casute; codul e deja trimis de cine a deschis cardul
 *   parola  — abia dupa ce codul e confirmat de server: email (fix), parola, repeta
 *   gata    — confirmarea
 *
 * Campurile de parola apar dupa confirmarea codului dinadins: altfel omul isi
 * tasteaza parola de doua ori si abia atunci afla ca a gresit codul.
 */
export function CardParolaNoua({
  email,
  titlu,
  onInchide,
}: {
  email: string;
  titlu: string;
  onInchide: () => void;
}) {
  const [faza, setFaza] = useState<"cod" | "parola" | "gata">("cod");
  const [cod, setCod] = useState("");
  const [parola, setParola] = useState("");
  const [confirm, setConfirm] = useState("");
  const [vede, setVede] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    `Ți-am trimis un cod de ${LUNGIME_COD} caractere la adresa de mai jos. Verifică și în „Spam".`,
  );

  // Escape inchide cardul — altfel, pe desktop, singura iesire e butonul „×".
  useEffect(() => {
    function laTasta(e: KeyboardEvent) {
      if (e.key === "Escape") onInchide();
    }
    window.addEventListener("keydown", laTasta);
    return () => window.removeEventListener("keydown", laTasta);
  }, [onInchide]);

  async function cereAltCod() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/parola-uitata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Eroare la trimitere.");
      setCod("");
      setFaza("cod");
      setInfo("Ți-am trimis un cod nou. Cel vechi nu mai e bun.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la trimitere.");
    } finally {
      setLoading(false);
    }
  }

  async function verifica(codDeVerificat?: string) {
    const c = codDeVerificat ?? cod;
    setError("");
    setInfo("");
    if (c.trim().length < LUNGIME_COD) return setError(`Completează toate cele ${LUNGIME_COD} caractere.`);

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verifica-cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cod: c }),
      });
      const d = await res.json();
      if (!res.ok) {
        // Cod expirat sau incercari epuizate: golim casutele, ca sa nu tot apese
        // pe un cod mort crezand ca l-a tastat gresit.
        if (d.reia) setCod("");
        throw new Error(d.error ?? "Cod greșit.");
      }
      setFaza("parola");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cod greșit.");
    } finally {
      setLoading(false);
    }
  }

  async function salveaza(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!parolaValida(parola)) return setError(REGULA_PAROLA);
    if (parola !== confirm) return setError("Parolele nu coincid.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/parola-noua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cod, parola }),
      });
      const d = await res.json();
      if (!res.ok) {
        // Codul a murit intre timp (a expirat sau a fost inlocuit): inapoi la casute.
        if (d.reia) {
          setCod("");
          setFaza("cod");
        }
        throw new Error(d.error ?? "Eroare.");
      }
      setFaza("gata");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-8"
      role="dialog" aria-modal="true" aria-label={titlu}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onInchide} />

      <div className="relative my-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1020] p-6 sm:p-8">
        <button type="button" onClick={onInchide} aria-label="Închide"
          className="absolute right-3 top-3 h-8 w-8 rounded-lg text-xl leading-none text-slate-400 transition hover:bg-white/10 hover:text-white">
          ×
        </button>

        {/* ── Faza 1: codul ──────────────────────────────────────────────── */}
        {faza === "cod" && (
          <>
            <h2 className="mb-2 text-lg font-semibold text-white">{titlu}</h2>
            {info && <p className="mb-3 text-sm text-slate-400">{info}</p>}
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <p className="mb-4 break-all text-sm font-medium text-violet-300">{email}</p>

            <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-400">Ce ai de făcut</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
                <li>Deschide-ți emailul, la adresa scrisă mai sus.</li>
                <li>Caută mesajul de la <strong className="text-white">VoSmart</strong>, cu subiectul <strong className="text-white">„Cod pentru parola nouă"</strong>.</li>
                <li>Scrie mai jos cele <strong className="text-white">8 caractere</strong> din email, în ordine, câte unul în fiecare căsuță.</li>
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Nu găsești emailul? Uită-te în „Spam" sau „Nedorite". Poți scrie cu litere mici — se fac singure mari.
                Poți și să copiezi codul din email și să-l lipești direct în prima căsuță. În cod nu există niciodată{" "}
                <strong className="text-slate-400">0, 1, O, I sau L</strong>, tocmai ca să nu le confunzi între ele.
              </p>
            </div>

            <CampCod valoare={cod} onChange={setCod} onComplet={c => verifica(c)} disabled={loading} />

            <button type="button" className={`${BUTON} mt-5`} onClick={() => verifica()} disabled={loading}>
              {loading ? "Se verifică..." : "Verifică codul"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Codul e valabil 30 de minute și se folosește o singură dată.{" "}
              <button type="button" onClick={cereAltCod} disabled={loading}
                className="text-violet-400 underline transition hover:text-violet-300 disabled:opacity-50">
                Trimite-mi alt cod
              </button>
            </p>
          </>
        )}

        {/* ── Faza 2: parola noua ────────────────────────────────────────── */}
        {faza === "parola" && (
          <form onSubmit={salveaza} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Cod corect. Alege parola nouă</h2>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-400">Ce ai de făcut</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
                <li>Gândește-te la o parolă nouă, de <strong className="text-white">minim {LUNGIME_MINIMA_PAROLA} caractere</strong>.</li>
                <li>Scrie-o în căsuța <strong className="text-white">„Parolă nouă"</strong>.</li>
                <li>Scrie-o <strong className="text-white">încă o dată, la fel</strong>, în căsuța de sub ea.</li>
                <li>Apasă <strong className="text-white">„Salvează parola nouă"</strong>.</li>
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Apasă pe ochiul 👁 din dreapta dacă vrei să vezi ce ai tastat. Notează-ți parola undeva — cu ea intri de acum înainte.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Utilizator</label>
              <input type="email" className={`${INPUT} cursor-not-allowed opacity-60`} value={email} disabled readOnly />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Parolă nouă</label>
              <div className="relative">
                <input type={vede ? "text" : "password"} className={`${INPUT} pr-12`} value={parola}
                  onChange={e => setParola(e.target.value)} autoComplete="new-password"
                  minLength={LUNGIME_MINIMA_PAROLA} autoFocus />
                <button type="button" onClick={() => setVede(v => !v)}
                  aria-label={vede ? "Ascunde parolele" : "Arată parolele"}
                  title={vede ? "Ascunde parolele" : "Arată parolele"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-base text-slate-400 transition hover:bg-white/10 hover:text-white">
                  {vede ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Repetă parola nouă</label>
              <div className="relative">
                <input type={vede ? "text" : "password"} className={`${INPUT} pr-12`} value={confirm}
                  onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
                  minLength={LUNGIME_MINIMA_PAROLA} />
                <button type="button" onClick={() => setVede(v => !v)}
                  aria-label={vede ? "Ascunde parolele" : "Arată parolele"}
                  title={vede ? "Ascunde parolele" : "Arată parolele"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-base text-slate-400 transition hover:bg-white/10 hover:text-white">
                  {vede ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button type="submit" className={BUTON} disabled={loading}>
              {loading ? "Se salvează..." : "Salvează parola nouă"}
            </button>
          </form>
        )}

        {/* ── Faza 3: gata ───────────────────────────────────────────────── */}
        {faza === "gata" && (
          <>
            <div aria-hidden="true"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-2xl text-emerald-400">
              ✓
            </div>
            <h2 className="mb-2 text-center text-lg font-semibold text-white">Parola a fost schimbată</h2>
            <p className="mb-5 text-center text-sm text-slate-400">
              De acum intri în cont cu parola nouă. Cea veche nu mai e bună, iar sesiunile rămase deschise pe alte
              dispozitive au fost închise.
            </p>

            <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-400">Mai departe</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
                <li>Apasă butonul de mai jos.</li>
                <li>Scrie <strong className="text-white">emailul tău</strong> și <strong className="text-white">parola nouă</strong>.</li>
                <li>Apasă <strong className="text-white">„Intră în cont"</strong>.</li>
              </ol>
            </div>

            <button type="button" className={BUTON} onClick={onInchide}>
              Mergi la autentificare
            </button>
          </>
        )}
      </div>
    </div>
  );
}
