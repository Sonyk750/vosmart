/**
 * Pachetele care se pot plati pe site, cu preturile de azi.
 *
 * O SINGURA sursa de adevar: si pagina care le afiseaza, si sesiunea de plata
 * trimisa la Stripe citesc de aici. Altfel ajung sa se contrazica — omul vede
 * 720 lei pe card si plateste altceva pe pagina Stripe, iar diferenta se
 * observa abia pe extras.
 *
 * Ce NU se plateste online, si de ce:
 *  - `trial` — e gratuit, nu are ce cauta la casa de marcat;
 *  - `enterprise` — pret personalizat; daca ar trece prin Checkout cu 0 lei,
 *    oricine si-ar activa pachetul cel mai mare fara sa plateasca. Ramane pe
 *    cererea de oferta.
 */

export type PachetAsociatie = "smart" | "premium";
export type PachetCorporate = "starter" | "business" | "professional";
export type Pachet = PachetAsociatie | PachetCorporate;

/** Cenzorat pentru o asociatie: pretul se inmulteste cu numarul de apartamente. */
export const PACHETE_ASOCIATIE: Record<PachetAsociatie, { nume: string; leiPeApartament: number }> = {
  smart:   { nume: "Smart",   leiPeApartament: 4.5 },
  premium: { nume: "Premium", leiPeApartament: 5.7 },
};

/** Platforma pentru firme de cenzorat: pret fix pe luna, dupa cate dosare intra. */
export const PACHETE_CORPORATE: Record<PachetCorporate, { nume: string; leiPeLuna: number; dosare: number }> = {
  starter:      { nume: "Starter",      leiPeLuna: 350,  dosare: 10 },
  business:     { nume: "Business",     leiPeLuna: 720,  dosare: 25 },
  professional: { nume: "Professional", leiPeLuna: 1390, dosare: 50 },
};

/**
 * Cate apartamente acceptam intr-o comanda. Marginea de jos opreste comanda de
 * 0 apartamente (adica 0 lei pe luna), cea de sus opreste greselile de tastare
 * — 4800 in loc de 48 ar porni un abonament de 21.600 lei.
 */
export const MIN_APARTAMENTE = 1;
export const MAX_APARTAMENTE = 1000;

export function estePachetAsociatie(p: string): p is PachetAsociatie {
  return p in PACHETE_ASOCIATIE;
}

export function estePachetCorporate(p: string): p is PachetCorporate {
  return p in PACHETE_CORPORATE;
}

/** Stripe socoteste in bani, nu in lei: 5,7 lei = 570. */
export function leiInBani(lei: number): number {
  return Math.round(lei * 100);
}

/** 1390 -> "1.390", 4.5 -> "4,5". Cum se scriu numerele in romana. */
export function scrieLei(lei: number): string {
  return lei.toLocaleString("ro-RO", { maximumFractionDigits: 2 });
}

/** Numele pachetului si cat costa pe luna, pentru o comanda anume. */
export function costLunar(pachet: Pachet, apartamente: number): { nume: string; lei: number } {
  if (estePachetAsociatie(pachet)) {
    const p = PACHETE_ASOCIATIE[pachet];
    return { nume: p.nume, lei: p.leiPeApartament * apartamente };
  }
  const p = PACHETE_CORPORATE[pachet as PachetCorporate];
  return { nume: p.nume, lei: p.leiPeLuna };
}
