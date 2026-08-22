/**
 * Registrul tipurilor de documente dintr-un dosar de cenzorat.
 *
 * Pana acum aceeasi lista traia in patru locuri: formularul de incarcare,
 * clasificatorul de ZIP, ruta care genereaza raportul si sabloanele HTML. Cand
 * se adauga un tip nou, trei din patru ramaneau in urma si documentul aparea in
 * dosar cu numele brut din baza (`situatie_activ_pasiv`). De aici incolo se
 * schimba doar aici.
 */

export type Categorie = "principal" | "registru" | "banca" | "anexa";

export type TipDocument = {
  /** Cheia din baza de date. Nu se schimba niciodata — sunt randuri deja scrise. */
  cheie: string;
  eticheta: string;
  /** Ce e, pe scurt, pentru cineva care nu stie contabilitate de asociatie. */
  explicatie: string;
  categorie: Categorie;
  /** Fara el nu se poate face un raport de cenzor. */
  obligatoriu: boolean;
  /** Cate fisiere pot veni sub acelasi tip (facturi: multe, lista de plata: una). */
  minim?: number;
  multiplu: boolean;
  /** Doar la pachetele platite. Trial-ul primeste doar minimul legal. */
  extins: boolean;
  /**
   * Bucati de nume de fisier care tradeaza tipul. Ordinea din `TIPURI` conteaza:
   * primul tipar care se potriveste castiga, deci tipurile inguste stau inaintea
   * celor largi („registru_banca" inaintea lui „banca").
   */
  tipare: string[];
};

export const TIPURI: TipDocument[] = [
  {
    cheie: "lista_plata",
    eticheta: "Lista de plată",
    explicatie: "Lista lunară afișată la avizier, cu cotele pe apartament.",
    categorie: "principal", obligatoriu: true, multiplu: false, extins: false,
    tipare: ["lista de plata", "lista_plata", "lista-plata", "listaplata", "lista"],
  },
  {
    cheie: "explicatii_lista",
    eticheta: "Explicațiile listei",
    explicatie: "Notele care arată cum s-a calculat fiecare coloană din listă.",
    categorie: "principal", obligatoriu: true, multiplu: false, extins: false,
    tipare: ["explicat", "note lista", "anexa lista"],
  },
  {
    cheie: "distributia_facturilor",
    eticheta: "Distribuirea facturilor",
    explicatie: "Cum s-a repartizat fiecare factură pe apartamente.",
    categorie: "principal", obligatoriu: true, multiplu: false, extins: false,
    tipare: ["distribut", "repartiz", "defalcare"],
  },
  {
    cheie: "facturi",
    eticheta: "Facturi furnizori",
    explicatie: "Facturile lunii de la furnizorii de utilități și servicii.",
    categorie: "principal", obligatoriu: true, minim: 2, multiplu: true, extins: false,
    tipare: ["factur", "furnizor", "utilitat"],
  },
  {
    cheie: "extras_cont",
    eticheta: "Extras de cont",
    explicatie: "Extrasul bancar al lunii — dovada plăților efectiv făcute.",
    categorie: "banca", obligatoriu: false, multiplu: true, extins: false,
    tipare: ["extras", "sold cont", "statement"],
  },
  {
    cheie: "registru_casa",
    eticheta: "Registru de casă",
    explicatie: "Încasările și plățile în numerar, zi cu zi.",
    categorie: "registru", obligatoriu: false, multiplu: false, extins: true,
    tipare: ["registru casa", "registru_casa", "reg casa", "casa", "casă"],
  },
  {
    cheie: "registru_banca",
    eticheta: "Registru bancă",
    explicatie: "Oglinda extrasului, ținută de administrator.",
    categorie: "banca", obligatoriu: false, multiplu: true, extins: true,
    tipare: ["registru banca", "registru_banca", "reg banca", "banca", "bancă"],
  },
  {
    cheie: "registru_jurnal",
    eticheta: "Registru jurnal",
    explicatie: "Jurnalul operațiunilor contabile ale lunii.",
    categorie: "registru", obligatoriu: false, multiplu: false, extins: true,
    tipare: ["jurnal"],
  },
  {
    cheie: "registru_fond",
    eticheta: "Registru fond",
    explicatie: "Mișcările fondului de rulment / reparații / penalități.",
    categorie: "registru", obligatoriu: false, multiplu: true, extins: true,
    tipare: ["fond"],
  },
  {
    cheie: "situatie_activ_pasiv",
    eticheta: "Situație activ / pasiv",
    explicatie: "Situația elementelor de activ și pasiv la finalul lunii.",
    categorie: "registru", obligatoriu: false, multiplu: false, extins: true,
    tipare: ["activ", "pasiv", "bilant", "bilanț", "situatie patrimon"],
  },
  {
    cheie: "citiri_apometre",
    eticheta: "Citiri apometre",
    explicatie: "Indexurile de apă / repartitoare care stau la baza repartiției.",
    categorie: "anexa", obligatoriu: false, multiplu: true, extins: true,
    tipare: ["apometr", "citir", "index", "contor", "repartitor"],
  },
  {
    cheie: "stat_plata",
    eticheta: "Stat de plată",
    explicatie: "Statul de salarii al personalului asociației.",
    categorie: "anexa", obligatoriu: false, multiplu: false, extins: true,
    tipare: ["stat de plata", "stat_plata", "stat plata", "salar"],
  },
];

const DUPA_CHEIE = new Map(TIPURI.map(t => [t.cheie, t]));

/**
 * Fisierele multiple primesc chei cu sufix (`facturi_2`, `extras_cont_3`), ca sa
 * incapa mai multe randuri sub acelasi tip. Aici le taiem inapoi la tipul de baza.
 */
export function tipDeBaza(cheie: string): string {
  const fara = cheie.replace(/_\d+$/, "");
  return DUPA_CHEIE.has(fara) ? fara : cheie;
}

export function tip(cheie: string): TipDocument | undefined {
  return DUPA_CHEIE.get(tipDeBaza(cheie));
}

export function eticheta(cheie: string): string {
  return tip(cheie)?.eticheta ?? cheie.replace(/_/g, " ");
}

export const TIPURI_OBLIGATORII = TIPURI.filter(t => t.obligatoriu).map(t => t.cheie);

/** Ce are voie sa trimita un cont Trial: strictul necesar pentru un raport. */
export const TIPURI_TRIAL = TIPURI.filter(t => !t.extins).map(t => t.cheie);

/**
 * Ghiceste tipul dupa numele fisierului. Intoarce si cat de sigur e, fiindca
 * ecranul de incarcare arata altfel o potrivire sigura fata de una pe ghicite:
 * omul trebuie sa stie unde sa se uite inainte sa trimita dosarul.
 */
export function ghicesteTip(numeFisier: string): { cheie: string; incredere: "sigur" | "probabil" | "necunoscut" } {
  const nume = numeFisier
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[_\-.]+/g, " ");

  for (const t of TIPURI) {
    for (const tipar of t.tipare) {
      const curat = tipar.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[_\-.]+/g, " ");
      if (!nume.includes(curat)) continue;
      // Un tipar lung („registru casa") descrie fisierul; unul scurt („casa")
      // poate sa fie doar o bucata dintr-un cuvant, deci nu ne bazam pe el.
      return { cheie: t.cheie, incredere: curat.length >= 6 ? "sigur" : "probabil" };
    }
  }
  return { cheie: "altele", incredere: "necunoscut" };
}

/** Ce lipseste dintr-un dosar, in cuvintele omului, nu in chei de baza de date. */
export function lipsuri(cheiPrezente: string[]): string[] {
  const prezente = cheiPrezente.map(tipDeBaza);
  const lipsa: string[] = [];
  for (const t of TIPURI) {
    if (!t.obligatoriu) continue;
    const cate = prezente.filter(c => c === t.cheie).length;
    if (cate < (t.minim ?? 1)) {
      lipsa.push(t.minim && t.minim > 1 ? `${t.eticheta} (minimum ${t.minim})` : t.eticheta);
    }
  }
  return lipsa;
}
