import { Constatare, SEVERITATI, Severitate, StareConstatare } from "./tipuri";
import { esteNeverificat } from "./verificari";

/**
 * Scorul de corectitudine, calculat din constatari.
 *
 * Inainte, scorul era un numar pe care modelul il scria in proza si pe care il
 * citeam cu o expresie regulata; nu se putea explica si nu se putea reface. Aici
 * scorul e o scadere: pornim de la 100 si taiem greutatea fiecarei constatari
 * ramase in picioare.
 *
 * Doua consecinte practice:
 *  - cand cenzorul respinge o constatare, scorul se recalculeaza pe loc, in fata
 *    lui, si vede exact cat a miscat;
 *  - la intrebarea „de ce 62%?" raspunsul e o lista, nu o parere.
 */

export type Verdict = "conform" | "observatii" | "incomplet" | "neconform" | "grav";

export const VERDICTE: Record<Verdict, { eticheta: string; ton: string; descriere: string }> = {
  conform:     { eticheta: "Conform",              ton: "ok",   descriere: "Nu s-au constatat abateri care să afecteze situația financiară." },
  observatii:  { eticheta: "Conform cu observații", ton: "info", descriere: "Abateri minore, remediabile în luna următoare." },
  incomplet:   { eticheta: "Verificare incompletă", ton: "warn", descriere: "Unele verificări de bază nu s-au putut face, din lipsă de date. Concluzia nu acoperă acele zone." },
  neconform:   { eticheta: "Neconform",            ton: "warn", descriere: "Abateri care trebuie remediate înainte de aprobarea execuției." },
  grav:        { eticheta: "Deficiențe grave",     ton: "bad",  descriere: "Abateri care pun în discuție corectitudinea evidenței." },
};

export type Scor = {
  valoare: number;
  verdict: Verdict;
  /** Cat a taiat fiecare treapta de severitate, ca sa se poata arata defalcarea. */
  defalcare: { severitate: Severitate; eticheta: string; numar: number; puncte: number }[];
  /** Constatarile luate in calcul (respinse de cenzor nu intra). */
  luateInCalcul: number;
  ignorate: number;
};

/** O constatare respinsa de cenzor iese din calcul; restul conteaza. */
function intraInCalcul(stare: StareConstatare | undefined): boolean {
  return stare !== "respinsa";
}

export function calculeazaScor(
  constatari: (Constatare & { stare?: StareConstatare })[],
): Scor {
  const active = constatari.filter(c => intraInCalcul(c.stare));
  const ignorate = constatari.length - active.length;

  const defalcare = (Object.keys(SEVERITATI) as Severitate[]).map(sev => {
    const dinCategorie = active.filter(c => c.severitate === sev);
    // A doua constatare de aceeasi severitate doare mai putin decat prima:
    // altfel opt observatii mici ar cobori scorul mai jos decat o frauda. Scara
    // e 100%, 70%, 49%... din greutatea de baza.
    let puncte = 0;
    dinCategorie.forEach((_, i) => {
      puncte += SEVERITATI[sev].greutate * Math.pow(0.7, i);
    });
    return {
      severitate: sev,
      eticheta: SEVERITATI[sev].eticheta,
      numar: dinCategorie.length,
      puncte: Math.round(puncte * 10) / 10,
    };
  }).filter(d => d.numar > 0);

  const scazut = defalcare.reduce((s, d) => s + d.puncte, 0);
  const valoare = Math.max(0, Math.min(100, Math.round(100 - scazut)));

  // Verdictul nu se ia doar din numar: o singura constatare critica inseamna
  // deficiente grave chiar daca restul dosarului e impecabil si scorul iese mare.
  //
  // Doua reguli noi, amandoua ca sa nu mai iasa „Conform" pe nedrept:
  //  - o constatare „ridicata" (bani care nu se leaga, document lipsa, CUI
  //    strain) inseamna „neconform", oricat de bun ar fi restul scorului. Inainte
  //    5.000 lei ceruti fara factura ieseau „conform cu observatii";
  //  - o verificare de baza care nu s-a putut face (NEVERIFICAT-…) interzice
  //    „Conform": lipsa constatarilor nu inseamna ca dosarul e curat, ci ca nu
  //    s-a putut verifica. Cenzorul o poate respinge daca a verificat el zona.
  const areCritica = active.some(c => c.severitate === "critica");
  const areRidicata = active.some(c => c.severitate === "ridicata");
  const areNeverificat = active.some(c => esteNeverificat(c.cod));
  // O constatare „medie" ramasa in picioare e o observatie, chiar daca singura ei
  // scade scorul doar la 93: „Conform" ar spune ca n-a fost nimic de semnalat.
  const areMedie = active.some(c => c.severitate === "medie");
  const verdict: Verdict =
    areCritica ? "grav"
    : areRidicata || valoare < 60 ? "neconform"
    : areNeverificat ? "incomplet"
    : valoare < 90 || areMedie ? "observatii"
    : "conform";

  return { valoare, verdict, defalcare, luateInCalcul: active.length, ignorate };
}

/**
 * Cat de mult ar creste scorul daca s-ar respinge constatarea asta. Il folosim
 * in ecranul cenzorului, ca sa vada consecinta inainte sa apese.
 */
export function impact(
  constatari: (Constatare & { stare?: StareConstatare })[],
  cod: string,
): number {
  const acum = calculeazaScor(constatari).valoare;
  const fara = calculeazaScor(constatari.map(c => (c.cod === cod ? { ...c, stare: "respinsa" as const } : c))).valoare;
  return fara - acum;
}
