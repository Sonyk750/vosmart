/**
 * Forma datelor cu care lucreaza cenzoratul.
 *
 * Ideea de baza a rescrierii: AI-ul NU mai scrie un raport in proza din care
 * incercam pe urma sa scoatem cifre cu expresii regulate. AI-ul citeste
 * documentele si intoarce DATE (`ExtrasDosar`). Constatarile si scorul se
 * calculeaza din date, cu reguli scrise de om, care se pot citi si contesta.
 *
 * Diferenta practica: intrebarea „de ce scorul e 62%?" are acum un raspuns —
 * lista de constatari, fiecare cu greutatea ei. Inainte scorul era un numar pe
 * care modelul il scria in text si pe care il citeam cu
 * `/Scor corectitudine[:\s]+(\d+)%/`.
 */

/** `null` inseamna „nu s-a gasit in documente" — si asta e in sine o constatare. */
export type Suma = number | null;

export type Chitanta = { numar: string | null; suma: Suma };

export type ExtrasDosar = {
  identificare: {
    denumire: string | null;
    cui: string | null;
    adresa: string | null;
    iban: string | null;
    banca: string | null;
    presedinte: string | null;
    administrator: string | null;
    cenzor: string | null;
  };
  perioada: {
    luna: string | null;
    an: number | null;
    /** Data la care lista a fost afisata la avizier, asa cum scrie pe ea. */
    dataAfisarii: string | null;
    dataScadenta: string | null;
  };
  casa: {
    soldInitial: Suma;
    soldFinal: Suma;
    totalIncasari: Suma;
    totalPlati: Suma;
    primaChitanta: Chitanta;
    ultimaChitanta: Chitanta;
    /** Cel mai mare sold de casa dintr-o zi — asta se compara cu plafonul. */
    soldMaximZilnic: Suma;
    zileCuIncasari: number | null;
  };
  banca: {
    soldInitial: Suma;
    soldFinal: Suma;
    totalIncasari: Suma;
    totalPlati: Suma;
    conturi: { iban: string | null; descriere: string; sold: Suma }[];
  };
  fonduri: {
    rulment: Suma;
    reparatii: Suma;
    penalitati: Suma;
    altele: { denumire: string; sold: Suma }[];
  };
  lista: {
    totalCheltuieli: Suma;
    totalRestante: Suma;
    numarApartamente: number | null;
    /** Denumirile coloanelor, exact cum apar pe lista. */
    coloane: string[];
    areColoanaRestante: boolean | null;
    areColoanaPenalizari: boolean | null;
    areColoanaFondRulment: boolean | null;
  };
  restantieri: {
    total: Suma;
    apartamente: { apartament: string; suma: number; luniIntarziere: number | null }[];
  };
  furnizori: {
    facturi: {
      furnizor: string;
      numar: string | null;
      data: string | null;
      suma: Suma;
      achitata: boolean | null;
      /** „banca" | „numerar" | null daca nu reiese din documente. */
      modalitatePlata: string | null;
    }[];
    totalNeachitat: Suma;
  };
  penalizari: {
    aplicate: boolean | null;
    cotaZilnica: number | null;
    total: Suma;
  };
  salarii: {
    exista: boolean | null;
    total: Suma;
  };
  /** Ce nu s-a putut citi. Fara asta, un dosar ilizibil ar trece drept curat. */
  documenteProblematice: { tip: string; problema: string }[];
};

export const EXTRAS_GOL: ExtrasDosar = {
  identificare: { denumire: null, cui: null, adresa: null, iban: null, banca: null, presedinte: null, administrator: null, cenzor: null },
  perioada: { luna: null, an: null, dataAfisarii: null, dataScadenta: null },
  casa: { soldInitial: null, soldFinal: null, totalIncasari: null, totalPlati: null, primaChitanta: { numar: null, suma: null }, ultimaChitanta: { numar: null, suma: null }, soldMaximZilnic: null, zileCuIncasari: null },
  banca: { soldInitial: null, soldFinal: null, totalIncasari: null, totalPlati: null, conturi: [] },
  fonduri: { rulment: null, reparatii: null, penalitati: null, altele: [] },
  lista: { totalCheltuieli: null, totalRestante: null, numarApartamente: null, coloane: [], areColoanaRestante: null, areColoanaPenalizari: null, areColoanaFondRulment: null },
  restantieri: { total: null, apartamente: [] },
  furnizori: { facturi: [], totalNeachitat: null },
  penalizari: { aplicate: null, cotaZilnica: null, total: null },
  salarii: { exista: null, total: null },
  documenteProblematice: [],
};

/* ------------------------------------------------------------------ */

export type Severitate = "critica" | "ridicata" | "medie" | "scazuta" | "info";

export const SEVERITATI: Record<Severitate, { eticheta: string; greutate: number; ton: string }> = {
  critica:  { eticheta: "Critică",  greutate: 26, ton: "bad" },
  ridicata: { eticheta: "Ridicată", greutate: 15, ton: "risk" },
  medie:    { eticheta: "Medie",    greutate: 7,  ton: "warn" },
  scazuta:  { eticheta: "Scăzută",  greutate: 3,  ton: "info" },
  info:     { eticheta: "Observație", greutate: 0, ton: "info" },
};

/** De unde vine constatarea. Cenzorul trebuie sa stie pe ce sa se bazeze. */
export type Sursa =
  | "regula"   // calcul determinist pe datele extrase — se poate reface oricand
  | "ai"       // judecata modelului — se verifica
  | "cenzor";  // adaugata de om in timpul reviziei

export type StareConstatare = "deschisa" | "acceptata" | "respinsa";

export type Constatare = {
  /** Cod stabil, ca sa se poata urmari aceeasi problema de la o luna la alta. */
  cod: string;
  titlu: string;
  detaliu: string;
  severitate: Severitate;
  sursa: Sursa;
  /** Temeiul legal, daca exista unul confirmat. Vezi `temeiuri.ts`. */
  temei: string | null;
  /** Cifrele care au dus la constatare — asa se poate verifica fara sa redeschizi PDF-ul. */
  probe: { eticheta: string; valoare: string }[];
  /** Ce ar trebui facut. Intra direct in sectiunea de recomandari a raportului. */
  recomandare: string | null;
};

/* ------------------------------------------------------------------ */

export type Etapa = "intrare" | "extragere" | "verificare" | "sinteza" | "revizuire" | "semnat";

export const ETAPE: { cheie: Etapa; eticheta: string; descriere: string }[] = [
  { cheie: "intrare",    eticheta: "Preluare dosar",  descriere: "Fișierele sunt primite, verificate și puse la păstrare." },
  { cheie: "extragere",  eticheta: "Citire documente", descriere: "AI-ul citește documentele și scoate cifrele din ele." },
  { cheie: "verificare", eticheta: "Verificări",       descriere: "Regulile de cenzorat se aplică pe cifrele extrase." },
  { cheie: "sinteza",    eticheta: "Sinteză",          descriere: "Constatările se adună în proiectul de raport." },
  { cheie: "revizuire",  eticheta: "Revizuire cenzor", descriere: "Cenzorul confirmă, respinge sau completează constatările." },
  { cheie: "semnat",     eticheta: "Raport semnat",    descriere: "Raportul este semnat și pus la dispoziția asociației." },
];

export const INDEX_ETAPA: Record<Etapa, number> = Object.fromEntries(
  ETAPE.map((e, i) => [e.cheie, i]),
) as Record<Etapa, number>;

export type StareEtapa = "asteptare" | "in_lucru" | "gata" | "esuata";
