"use client";
import { Fragment, useRef } from "react";
import { LUNGIME_COD } from "@/lib/parola-cod";

/**
 * Cele 8 casute in care se tasteaza codul primit pe email.
 *
 * Accepta si lipirea codului intreg, sarind singur peste casute, si scrie mereu
 * cu majuscule — codul nu e sensibil la litere mari sau mici, dar asa omul vede
 * exact ce a primit in email.
 *
 * `autoComplete="one-time-code"` face ca pe iPhone codul din email sa apara ca
 * sugestie deasupra tastaturii; fara el trebuie iesit din aplicatie si tastat
 * din memorie, ceea ce e exact partea la care oamenii renunta.
 */
export function CampCod({
  valoare,
  onChange,
  onComplet,
  disabled,
}: {
  valoare: string;
  onChange: (v: string) => void;
  /** Chemat cand toate cele 8 casute sunt pline — ca sa se poata trimite direct. */
  onComplet?: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const caractere = valoare.padEnd(LUNGIME_COD, " ").slice(0, LUNGIME_COD).split("");

  function seteaza(index: number, ch: string) {
    const noi = caractere.slice();
    noi[index] = ch;
    const rezultat = noi.join("").replace(/\s+$/g, "");
    onChange(rezultat);
    if (rezultat.trim().length === LUNGIME_COD && !rezultat.includes(" ")) onComplet?.(rezultat);
  }

  function laTastare(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const ch = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    if (!ch) return;
    seteaza(index, ch);
    if (index < LUNGIME_COD - 1) refs.current[index + 1]?.focus();
  }

  function laTasta(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (caractere[index].trim()) seteaza(index, " ");
      else if (index > 0) {
        seteaza(index - 1, " ");
        refs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < LUNGIME_COD - 1) refs.current[index + 1]?.focus();
  }

  function laLipire(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, LUNGIME_COD);
    if (!text) return;
    onChange(text);
    if (text.length === LUNGIME_COD) onComplet?.(text);
    refs.current[Math.min(text.length, LUNGIME_COD - 1)]?.focus();
  }

  return (
    <div className="flex items-center justify-center gap-1.5" onPaste={laLipire}>
      {caractere.map((ch, i) => (
        <Fragment key={i}>
          {i === LUNGIME_COD / 2 && <span className="w-3" aria-hidden="true" />}
          <input
            ref={(el) => { refs.current[i] = el; }}
            className="h-12 w-9 rounded-lg border border-white/15 bg-black/20 text-center font-mono text-lg font-semibold uppercase text-white outline-none transition focus:border-violet-500 disabled:opacity-50 sm:w-10"
            value={ch.trim()}
            onChange={e => laTastare(i, e)}
            onKeyDown={e => laTasta(i, e)}
            onFocus={e => e.target.select()}
            disabled={disabled}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Caracterul ${i + 1} din cod`}
          />
        </Fragment>
      ))}
    </div>
  );
}
