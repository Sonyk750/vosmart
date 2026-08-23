import { prisma } from "@/lib/prisma";
import type { ExtrasDosar } from "./tipuri";
import { numarLuna } from "@/lib/luni";

/**
 * Ce stim despre ASOCIATIA ASTA, din lunile ei de dinainte.
 *
 * Ideea nu e a mea, e a lui Octav, si e mai buna decat ce aveam: regulile nu
 * trebuie sa masoare asociatia dupa un ideal inventat de mine, ci dupa cum
 * lucreaza ea de fapt si dupa ce cere legea. Dosarele raman toate in baza, deci
 * dupa doua-trei luni se poate afla singur ce cota de penalizare foloseste, ce
 * coloane are lista ei, si ce inseamna „restanta obisnuita" acolo.
 *
 * Nu e invatare automata si nu e nevoie sa fie: sunt interogari peste ce am
 * scris deja. Un model antrenat n-ar sti nimic in plus fata de asta, dar n-ai
 * mai putea citi de ce a decis ce a decis.
 *
 * REGULA DE FOND, valabila peste tot in fisierul asta: cand istoricul e prea
 * subtire, raspunsul e `null`, nu o presupunere. O regula care nu stie trebuie
 * sa TACA sau sa spuna ca nu stie — nu sa afirme.
 */

/** Sub atatea luni verificate, istoricul nu spune nimic de incredere. */
const MINIM_LUNI = 2;

export type ProfilAsociatie = {
  /** Cate luni verificate stau in spate. Zero la prima verificare. */
  luni: number;
  /**
   * Cota zilnica de penalizare pe care o foloseste asociatia, daca a folosit
   * vreuna. `null` inseamna „nu stim", nu „nu aplica".
   */
  cotaPenalizare: number | null;
  /** A aplicat penalizari in vreuna din lunile de dinainte? */
  aAplicatPenalizari: boolean | null;
  /** Coloanele care apar de obicei pe lista ei de plata. */
  coloaneObisnuite: string[];
  /** Cea mai mare restanta totala vazuta pana acum. Da masura a ce e „mult". */
  restantaMaxima: number | null;
  /** Media totalului lunar repartizat — pentru a vedea o luna iesita din tipar. */
  totalLunarMediu: number | null;
  /** Furnizorii care apar luna de luna; lipsa unuia merita intrebare. */
  furnizoriObisnuiti: string[];
};

export const PROFIL_GOL: ProfilAsociatie = {
  luni: 0,
  cotaPenalizare: null,
  aAplicatPenalizari: null,
  coloaneObisnuite: [],
  restantaMaxima: null,
  totalLunarMediu: null,
  furnizoriObisnuiti: [],
};

/** Numele furnizorului, adus la o forma comparabila. */
export function normalizeazaFurnizor(nume: string): string {
  return nume
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    // „S.R.L.", „SRL", „S.A.", „SA" — forme juridice care nu deosebesc nimic.
    .replace(/\b(s\.?r\.?l\.?|s\.?a\.?|s\.?c\.?|srl|sa)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Cheia unei facturi, pentru eliminarea duplicatelor.
 *
 * Numarul facturii e cel mai bun semn de identitate; cand lipseste, cadem pe
 * furnizor plus suma. Aceeasi factura citita din trei documente are acelasi
 * numar, chiar daca furnizorul e scris „Decoimob Tehno SRL" intr-un loc si
 * „Decoimob Tehno S.R.L." in altul.
 */
export function cheieFactura(f: { furnizor: string; numar: string | null; suma: number | null }): string {
  const numar = (f.numar ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (numar.length >= 4) return `n:${numar}`;
  return `f:${normalizeazaFurnizor(f.furnizor)}|${f.suma ?? "?"}`;
}

/** Facturile, o singura data fiecare. Pastreaza randul cel mai complet. */
export function faraDuplicate<T extends { furnizor: string; numar: string | null; suma: number | null }>(
  facturi: T[],
): T[] {
  const dupaCheie = new Map<string, T>();
  for (const f of facturi) {
    const cheie = cheieFactura(f);
    const avem = dupaCheie.get(cheie);
    if (!avem) { dupaCheie.set(cheie, f); continue; }
    // Pastram randul cu mai multe campuri completate: e acelasi document, citit
    // dintr-un loc mai bogat.
    const cate = (x: T) => Object.values(x).filter(v => v !== null && v !== undefined && v !== "").length;
    if (cate(f) > cate(avem)) dupaCheie.set(cheie, f);
  }
  return [...dupaCheie.values()];
}

/**
 * Aduna profilul din dosarele verificate ale contractului, mai putin cel curent.
 *
 * Se uita doar la dosare care au ajuns la revizuire sau mai departe: unul oprit
 * la jumatate n-are cifre pe care sa te poti sprijini.
 */
export async function profilAsociatiei(
  contractId: string,
  exclusDosarId: string,
): Promise<ProfilAsociatie> {
  const dosare = await prisma.dosar.findMany({
    where: {
      contractId,
      id: { not: exclusDosarId },
      etapa: { in: ["revizuire", "semnat"] },
      extras: { not: null as never },
    },
    select: { luna: true, an: true, extras: true },
  });
  if (dosare.length === 0) return PROFIL_GOL;

  dosare.sort((a, b) => b.an - a.an || (numarLuna(b.luna) ?? 0) - (numarLuna(a.luna) ?? 0));
  const extrase = dosare.map(d => d.extras as unknown as ExtrasDosar).filter(Boolean);

  const cote = extrase.map(e => e.penalizari?.cotaZilnica).filter((n): n is number => typeof n === "number" && n > 0);
  const aplicate = extrase.map(e => e.penalizari?.aplicate).filter((b): b is boolean => typeof b === "boolean");
  const restante = extrase.map(e => e.lista?.totalRestante).filter((n): n is number => typeof n === "number");
  const totaluri = extrase.map(e => e.lista?.totalCheltuieli).filter((n): n is number => typeof n === "number" && n > 0);

  // O coloana e „obisnuita" daca a aparut in majoritatea lunilor de dinainte. Cu
  // pragul asta, o luna in care administratorul a scos din greseala o coloana nu
  // sterge coloana din asteptari, dar nici una aparuta o singura data nu devine
  // obligatorie.
  const numarari = new Map<string, number>();
  for (const e of extrase) {
    for (const c of new Set(e.lista?.coloane ?? [])) {
      numarari.set(c, (numarari.get(c) ?? 0) + 1);
    }
  }
  const coloaneObisnuite = [...numarari.entries()]
    .filter(([, n]) => n > extrase.length / 2)
    .map(([c]) => c);

  const furnizoriPeLuni = new Map<string, number>();
  for (const e of extrase) {
    const unici = new Set(
      faraDuplicate(e.furnizori?.facturi ?? []).map(f => normalizeazaFurnizor(f.furnizor)),
    );
    for (const f of unici) furnizoriPeLuni.set(f, (furnizoriPeLuni.get(f) ?? 0) + 1);
  }

  return {
    luni: extrase.length,
    // Cota se ia din cea mai recenta luna in care s-a folosit una.
    cotaPenalizare: cote.length > 0 ? cote[0] : null,
    aAplicatPenalizari: aplicate.length > 0 ? aplicate.some(Boolean) : null,
    coloaneObisnuite: extrase.length >= MINIM_LUNI ? coloaneObisnuite : [],
    restantaMaxima: restante.length > 0 ? Math.max(...restante) : null,
    totalLunarMediu: totaluri.length > 0 ? totaluri.reduce((s, n) => s + n, 0) / totaluri.length : null,
    furnizoriObisnuiti: extrase.length >= MINIM_LUNI
      ? [...furnizoriPeLuni.entries()].filter(([, n]) => n >= extrase.length).map(([f]) => f)
      : [],
  };
}
