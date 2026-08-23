import { ETAPE, INDEX_ETAPA, type Etapa } from "@/lib/cenzorat/tipuri";
import type { Ton } from "@/app/components/baza";

/**
 * Cum se citeste un dosar lunar — o singura data, pentru toate ecranele.
 *
 * Ecranul de incarcare si cel de rapoarte arata aceleasi luni din unghiuri
 * diferite. Daca fiecare si-ar traduce singur `etapa` si `stareEtapa` in cuvinte
 * si culori, ar ajunge inevitabil sa nu semene: unul ar zice „La cenzor", altul
 * „Revizuire", pentru acelasi dosar. Traducerea se face aici.
 *
 * Modul NEUTRU: nu are „use client", deci poate fi citit si de pe server.
 */

export type FisierDinDosar = {
  id: string;
  numeFisier: string;
  tip: string;
  eticheta: string;
  mimeType: string;
  /** Cat ocupa in stocare, dupa recodare. */
  marime: number;
  /** Cat avea cand a fost trimis. Gol la fisierele intrate inainte de recodare. */
  marimeOriginala: number | null;
  /** sha256 al originalului — dovada a ce s-a primit. */
  amprenta: string | null;
  optimizat: boolean;
  /** Ce a citit modelul in document: „Factură Apa Nova". */
  denumireAi: string | null;
  emitentAi: string | null;
  perioadaAi: string | null;
  /** ai | nume | om — de unde vine tipul. */
  tipSursa: string;
  createdAt: string;
};

export type ConstatareScurta = {
  severitate: string;
  stare: string;
  sursa: string;
};

export type DosarLunar = {
  id: string;
  luna: string;
  an: number;
  titlu: string | null;
  etapa: Etapa;
  stareEtapa: string;
  incredere: number | null;
  scor: number | null;
  verdict: string | null;
  /** La esec, aici sta motivul; altfel, un rezumat scurt. */
  rezumat: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  terminatLa: string | null;
  createdAt: string;
  updatedAt: string;
  fisiere: FisierDinDosar[];
  constatari: ConstatareScurta[];
};

/* ------------------------------------------------------------- MARIMI */

export const mb = (octeti: number) => octeti / 1024 / 1024;

export function kb(octeti: number): string {
  return octeti < 1024 * 1024
    ? `${Math.max(1, Math.round(octeti / 1024))} KB`
    : `${mb(octeti).toFixed(1)} MB`;
}

/**
 * Cat cantareste un dosar — primit fata de pastrat.
 *
 * `marimeOriginala` lipseste la fisierele intrate inainte de recodare; atunci
 * cade pe `marime`, deci raportul iese 1:1 si nu se afiseaza nicio sageata.
 */
export function cantitate(fisiere: FisierDinDosar[]) {
  const primit = fisiere.reduce((s, f) => s + (f.marimeOriginala ?? f.marime), 0);
  const pastrat = fisiere.reduce((s, f) => s + f.marime, 0);
  return { primit, pastrat, strans: primit - pastrat };
}

/* -------------------------------------------------------------- STARE */

export const cuMajuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Unde a ajuns dosarul, in cuvinte si in culoare. */
export function stareDosar(d: DosarLunar): { text: string; ton: Ton; inLucru: boolean; procent: number } {
  const procent = ((INDEX_ETAPA[d.etapa] ?? 0) + 1) / ETAPE.length * 100;
  const numeEtapa = ETAPE.find(e => e.cheie === d.etapa)?.eticheta ?? d.etapa;

  if (d.stareEtapa === "esuata") return { text: "Verificare eșuată", ton: "bad", inLucru: false, procent };
  if (d.stareEtapa === "in_lucru") return { text: `${numeEtapa}…`, ton: "brand", inLucru: true, procent };
  if (d.etapa === "semnat") return { text: "Raport semnat", ton: "ok", inLucru: false, procent };
  if (d.etapa === "revizuire") return { text: "La cenzor", ton: "warn", inLucru: false, procent };
  if (d.etapa === "intrare") {
    return d.fisiere.length === 0
      ? { text: "Dosar gol", ton: "neutru", inLucru: false, procent: 0 }
      : { text: "Documente primite", ton: "info", inLucru: false, procent };
  }
  return { text: numeEtapa, ton: "info", inLucru: false, procent };
}

/** A trecut dosarul prin verificare? Scorul are inteles doar atunci. */
export function areRaportAi(d: DosarLunar): boolean {
  return d.scor !== null && (d.etapa === "revizuire" || d.etapa === "semnat");
}

/* ------------------------------------------------------------ VERDICT */

export const VERDICTE: Record<string, { eticheta: string; ton: Ton; explicatie: string }> = {
  conform: {
    eticheta: "Conform", ton: "ok",
    explicatie: "Nu s-a găsit nimic de semnalat peste pragul de atenție.",
  },
  observatii: {
    eticheta: "Cu observații", ton: "warn",
    explicatie: "Lucruri de lămurit, niciunul care să pună la îndoială evidența.",
  },
  neconform: {
    eticheta: "Neconform", ton: "risk",
    explicatie: "Abateri care trebuie remediate înainte de următoarea listă de plată.",
  },
  grav: {
    eticheta: "Deficiențe grave", ton: "bad",
    explicatie: "Cel puțin o constatare critică. Cere lămuriri înainte de orice semnătură.",
  },
};

export function verdictul(d: DosarLunar) {
  return VERDICTE[d.verdict ?? ""] ?? { eticheta: d.verdict ?? "—", ton: "neutru" as Ton, explicatie: "" };
}

/** Cate constatari intra efectiv in scor: cele respinse de cenzor nu. */
export function constatariActive(d: DosarLunar): ConstatareScurta[] {
  return d.constatari.filter(c => c.stare !== "respinsa");
}
