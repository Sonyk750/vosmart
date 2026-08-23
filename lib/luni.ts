/**
 * Lunile anului, intr-un singur loc.
 *
 * `Dosar.luna` tine numele lunii cu litere mici („august"), nu un numar. Lista
 * traia pana acum in `app/panou/date.ts`, un modul care aduce Prisma dupa el —
 * deci nu putea fi folosita si de ecranul de incarcare, care e componenta de
 * client. Aici e neutra: o pot citi si serverul, si browserul, si nu ajung doua
 * liste sa nu semene intre ele.
 */

export const LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
] as const;

export type NumeLuna = (typeof LUNI)[number];

/** 1–12 → „august". Intoarce `null` la orice altceva. */
export function numeLuna(numar: number): string | null {
  return Number.isInteger(numar) && numar >= 1 && numar <= 12 ? LUNI[numar - 1] : null;
}

/** „August", „august" → 8. Intoarce `null` daca nu e o luna. */
export function numarLuna(nume: string): number | null {
  const i = LUNI.indexOf(nume.trim().toLowerCase() as NumeLuna);
  return i === -1 ? null : i + 1;
}

/**
 * Luna la care se lucreaza acum: cea INCHEIATA, nu cea in curs.
 *
 * Cenzorul verifica o luna dupa ce s-a terminat si dupa ce asociatia a apucat
 * sa trimita documentele ei. In septembrie se lucreaza la august.
 */
export function lunaDeLucru(acum = new Date()): { luna: string; an: number; eticheta: string } {
  const d = new Date(acum.getFullYear(), acum.getMonth() - 1, 1);
  return { luna: LUNI[d.getMonth()], an: d.getFullYear(), eticheta: `${LUNI[d.getMonth()]} ${d.getFullYear()}` };
}
