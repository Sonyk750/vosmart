/**
 * Temeiurile legale invocate in constatari.
 *
 * Stau intr-un singur tabel, nu imprastiate prin sabloane, din doua motive.
 * Intai: un articol citat gresit intr-un raport de cenzor e o problema reala
 * pentru asociatie, deci trebuie sa existe UN loc unde se corecteaza. Al doilea:
 * fiecare intrare are `confirmat`, ca sa se vada negru pe alb ce a fost verificat
 * de un om si ce nu.
 *
 * Regula casei: nicio constatare nu inventeaza un articol. Daca o verificare
 * n-are un temei confirmat, `temei` ramane `null`, iar cenzorul il completeaza
 * la revizuire. Mai bine o constatare fara articol decat un articol gresit.
 */

export type Temei = {
  cheie: string;
  text: string;
  /**
   * `true` doar pentru citarile care erau deja in produs inainte de rescriere,
   * deci au trecut pe la cineva care stie legea. Restul asteapta confirmare.
   */
  confirmat: boolean;
};

const LISTA: Temei[] = [
  { cheie: "l196",            text: "Legea nr. 196/2018 privind înființarea, organizarea și funcționarea asociațiilor de proprietari și administrarea condominiilor", confirmat: true },
  { cheie: "l196_art54",      text: "art. 54 din Legea nr. 196/2018 — afișarea listei de plată", confirmat: true },
  { cheie: "l196_art55_1_o",  text: "art. 55 alin. (1) lit. o) din Legea nr. 196/2018 — obligația comitetului executiv de a urmări recuperarea creanțelor", confirmat: true },
  { cheie: "l196_art67",      text: "art. 67 din Legea nr. 196/2018 — plafonul de casă", confirmat: true },
  { cheie: "l196_art77",      text: "art. 77 din Legea nr. 196/2018 — penalizări pentru întârziere la plată", confirmat: true },
  { cheie: "ord1969",         text: "Ordinul nr. 1.969/2018 al MDLPA — reglementări contabile pentru asociațiile de proprietari", confirmat: true },
];

const DUPA_CHEIE = new Map(LISTA.map(t => [t.cheie, t]));

/** Intoarce textul temeiului doar daca a fost confirmat; altfel `null`. */
export function temei(cheie: string): string | null {
  const t = DUPA_CHEIE.get(cheie);
  return t && t.confirmat ? t.text : null;
}

export const TEMEIURI = LISTA;

/** Pragul de casa folosit de verificare, in lei. */
export const PLAFON_CASA_LEI = 1000;

/** Sub atat, diferentele sunt rotunjiri, nu constatari. */
export const TOLERANTA_ROTUNJIRE_LEI = 0.5;
