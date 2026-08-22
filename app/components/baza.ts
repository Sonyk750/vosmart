/**
 * Ce nu e componenta: tipuri, clase si formatare.
 *
 * Stau aici, intr-un modul NEUTRU, si nu in `ui.tsx`, fiindca `ui.tsx` e marcat
 * `"use client"`. Din asa ceva se poate importa o componenta si dintr-un ecran
 * de server — Next o trateaza ca margine de client — dar NU se poate chema o
 * functie si nu se pot citi proprietatile unui obiect. Incercarea cade cu
 * „Attempted to call dataRo() from the server but dataRo is on the client",
 * si abia la randare, nu la compilare: si `tsc`, si `next build` trec linistite.
 *
 * Ne-a prins de doua ori — o data cu pictogramele, o data cu formatarea datei.
 * De aceea regula e acum simpla si fara exceptii: in `ui.tsx` raman DOAR
 * componente. Orice altceva se importa de aici si merge in amandoua partile.
 */

export type Ton = "neutru" | "brand" | "ok" | "warn" | "risk" | "bad" | "info";

export const TON_TEXT: Record<Ton, string> = {
  neutru: "text-muted", brand: "text-brand-soft", ok: "text-ok",
  warn: "text-warn", risk: "text-risk", bad: "text-bad", info: "text-info",
};

/** Clasele unei casute de formular. Aceleasi peste tot, scrise o data. */
export const claseCamp =
  "w-full rounded-[var(--radius-field)] border border-line-strong bg-surface-1 px-3 py-2.5 text-[13.5px] text-ink placeholder:text-faint outline-none transition-colors focus:border-brand/60 focus:bg-surface-2";

export function lei(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " lei";
}

export function dataRo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}
