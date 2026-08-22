import { Constatare, ExtrasDosar } from "./tipuri";
import { PLAFON_CASA_LEI, TOLERANTA_ROTUNJIRE_LEI, temei } from "./temeiuri";
import { eticheta, lipsuri } from "./documente";

/**
 * Verificarile de cenzorat, scrise ca reguli care se pot citi.
 *
 * Fiecare regula primeste cifrele extrase din dosar si intoarce zero sau mai
 * multe constatari, fiecare cu probele pe care se sprijina. Nu exista aici
 * niciun apel la AI: acelasi dosar da acelasi rezultat de fiecare data, iar
 * cenzorul poate reface calculul pe hartie daca nu e de acord.
 *
 * Ce NU face regula: nu inventeaza articole de lege. Cand temeiul nu e confirmat
 * in `temeiuri.ts`, constatarea pleaca fara temei si o completeaza cenzorul.
 */

export type ContextVerificare = {
  extras: ExtrasDosar;
  /** Datele din fisa asociatiei, ca sa se poata compara cu ce scrie pe documente. */
  cuiDeclarat: string | null;
  denumireDeclarata: string | null;
  /** Cheile de tip ale fisierelor primite in dosar. */
  tipuriPrimite: string[];
};

const lei = (n: number) =>
  new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " lei";

const proc = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

/** `null` inseamna „nu s-a gasit", nu „zero". Regulile trebuie sa faca diferenta. */
const are = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

type Regula = (ctx: ContextVerificare) => Constatare[];

/* ---------------------------------------------------------------- CASA */

const casaPlafon: Regula = ({ extras }) => {
  const e = extras.casa;
  // Plafonul se uita la cel mai mare sold dintr-o zi. Daca nu avem soldul zilnic
  // maxim, soldul final e o aproximare slaba, dar tot spune ceva — o marcam ca
  // atare in probe, ca sa nu para o masuratoare pe care n-am facut-o.
  const valoare = are(e.soldMaximZilnic) ? e.soldMaximZilnic : e.soldFinal;
  if (!are(valoare) || valoare <= PLAFON_CASA_LEI) return [];
  const peSoldFinal = !are(e.soldMaximZilnic);
  return [{
    cod: "CASA-PLAFON",
    titlu: "Plafonul de casă este depășit",
    detaliu: `Soldul de casă ${peSoldFinal ? "la finalul lunii" : "maxim înregistrat într-o zi"} este de ${lei(valoare)}, peste plafonul de ${lei(PLAFON_CASA_LEI)}. Numerarul peste plafon trebuie depus în contul bancar al asociației.`,
    severitate: valoare > PLAFON_CASA_LEI * 3 ? "critica" : "ridicata",
    sursa: "regula",
    temei: temei("l196_art67"),
    probe: [
      { eticheta: peSoldFinal ? "Sold casă la final de lună" : "Sold casă maxim zilnic", valoare: lei(valoare) },
      { eticheta: "Plafon legal", valoare: lei(PLAFON_CASA_LEI) },
      { eticheta: "Depășire", valoare: lei(valoare - PLAFON_CASA_LEI) },
    ],
    recomandare: "Depunerea în bancă a numerarului care depășește plafonul, în ziua în care este încasat.",
  }];
};

const casaContinuitate: Regula = ({ extras }) => {
  const e = extras.casa;
  if (!are(e.soldInitial) || !are(e.soldFinal) || !are(e.totalIncasari) || !are(e.totalPlati)) return [];
  const asteptat = e.soldInitial + e.totalIncasari - e.totalPlati;
  const diferenta = e.soldFinal - asteptat;
  if (Math.abs(diferenta) <= TOLERANTA_ROTUNJIRE_LEI) return [];
  return [{
    cod: "CASA-CONTINUITATE",
    titlu: "Registrul de casă nu se închide",
    detaliu: `Soldul final raportat nu corespunde cu soldul inițial la care se adaugă încasările și se scad plățile. Diferența de ${lei(Math.abs(diferenta))} arată o operațiune neînregistrată sau o eroare de calcul în registru.`,
    severitate: "critica",
    sursa: "regula",
    temei: temei("ord1969"),
    probe: [
      { eticheta: "Sold inițial", valoare: lei(e.soldInitial) },
      { eticheta: "Total încasări", valoare: lei(e.totalIncasari) },
      { eticheta: "Total plăți", valoare: lei(e.totalPlati) },
      { eticheta: "Sold final calculat", valoare: lei(asteptat) },
      { eticheta: "Sold final raportat", valoare: lei(e.soldFinal) },
      { eticheta: "Diferență", valoare: lei(diferenta) },
    ],
    recomandare: "Refacerea registrului de casă pentru luna verificată și identificarea operațiunii lipsă.",
  }];
};

const casaNegativa: Regula = ({ extras }) => {
  const e = extras.casa;
  const negativ = [
    are(e.soldFinal) && e.soldFinal < 0 ? { et: "Sold final", v: e.soldFinal } : null,
    are(e.soldInitial) && e.soldInitial < 0 ? { et: "Sold inițial", v: e.soldInitial } : null,
  ].filter(Boolean) as { et: string; v: number }[];
  if (negativ.length === 0) return [];
  return [{
    cod: "CASA-NEGATIV",
    titlu: "Sold de casă negativ",
    detaliu: "Casieria nu poate avea sold negativ: ar însemna că s-au plătit bani care nu existau. Este o eroare de înregistrare sau o plată fără document justificativ.",
    severitate: "critica",
    sursa: "regula",
    temei: temei("ord1969"),
    probe: negativ.map(n => ({ eticheta: n.et, valoare: lei(n.v) })),
    recomandare: "Verificarea cronologică a chitanțelor și a dispozițiilor de plată din luna verificată.",
  }];
};

/* --------------------------------------------------------------- BANCA */

const bancaContinuitate: Regula = ({ extras }) => {
  const b = extras.banca;
  if (!are(b.soldInitial) || !are(b.soldFinal) || !are(b.totalIncasari) || !are(b.totalPlati)) return [];
  const asteptat = b.soldInitial + b.totalIncasari - b.totalPlati;
  const diferenta = b.soldFinal - asteptat;
  if (Math.abs(diferenta) <= TOLERANTA_ROTUNJIRE_LEI) return [];
  return [{
    cod: "BANCA-CONTINUITATE",
    titlu: "Registrul de bancă nu corespunde cu extrasul",
    detaliu: `Rulajul bancar al lunii nu duce de la soldul inițial la soldul final raportat. Diferența este de ${lei(Math.abs(diferenta))}.`,
    severitate: "ridicata",
    sursa: "regula",
    temei: temei("ord1969"),
    probe: [
      { eticheta: "Sold inițial", valoare: lei(b.soldInitial) },
      { eticheta: "Total încasări", valoare: lei(b.totalIncasari) },
      { eticheta: "Total plăți", valoare: lei(b.totalPlati) },
      { eticheta: "Sold final calculat", valoare: lei(asteptat) },
      { eticheta: "Sold final raportat", valoare: lei(b.soldFinal) },
    ],
    recomandare: "Punctarea registrului de bancă cu extrasul de cont, operațiune cu operațiune.",
  }];
};

/* ------------------------------------------------------- LISTA DE PLATA */

const listaColoane: Regula = ({ extras }) => {
  const l = extras.lista;
  const lipsa: string[] = [];
  if (l.areColoanaRestante === false) lipsa.push("restanțe");
  if (l.areColoanaPenalizari === false) lipsa.push("penalizări");
  if (l.areColoanaFondRulment === false) lipsa.push("fond de rulment");
  if (lipsa.length === 0) return [];
  return [{
    cod: "LISTA-COLOANE",
    titlu: "Lista de plată nu conține toate coloanele",
    detaliu: `Din lista afișată lipsesc coloanele: ${lipsa.join(", ")}. Proprietarul nu poate verifica singur ce datorează dacă lista nu arată toate componentele.`,
    severitate: "medie",
    sursa: "regula",
    temei: temei("l196_art54"),
    probe: [
      { eticheta: "Coloane lipsă", valoare: lipsa.join(", ") },
      ...(l.coloane.length > 0 ? [{ eticheta: "Coloane găsite", valoare: l.coloane.join(", ") }] : []),
    ],
    recomandare: "Completarea formatului listei de plată cu toate coloanele prevăzute de lege.",
  }];
};

const listaDataAfisarii: Regula = ({ extras }) => {
  if (extras.lista.totalCheltuieli === null && extras.lista.coloane.length === 0) return [];
  if (extras.perioada.dataAfisarii) return [];
  return [{
    cod: "LISTA-AFISARE-LIPSA",
    titlu: "Data afișării nu este trecută pe listă",
    detaliu: "Fără data afișării nu se poate stabili termenul de plată și nici momentul de la care curg penalizările. Data trebuie să fie vizibilă pe lista afișată la avizier.",
    severitate: "medie",
    sursa: "regula",
    temei: temei("l196_art54"),
    probe: [{ eticheta: "Data afișării", valoare: "nu apare pe document" }],
    recomandare: "Înscrierea datei afișării pe fiecare listă de plată, la momentul afișării.",
  }];
};

const listaVsFacturi: Regula = ({ extras }) => {
  const total = extras.lista.totalCheltuieli;
  const facturi = extras.furnizori.facturi.filter(f => are(f.suma));
  if (!are(total) || facturi.length === 0) return [];
  const sumaFacturi = facturi.reduce((s, f) => s + (f.suma as number), 0);
  const diferenta = total - sumaFacturi;
  // Lista contine si cheltuieli care nu vin din facturi (salarii, fond de
  // rulment), deci o diferenta mica e normala. Semnalam doar cand lista e MAI
  // MICA decat facturile: atunci raman cheltuieli nerepartizate.
  if (diferenta >= -TOLERANTA_ROTUNJIRE_LEI) return [];
  return [{
    cod: "LISTA-VS-FACTURI",
    titlu: "Facturile lunii depășesc totalul repartizat pe listă",
    detaliu: `Facturile primite însumează ${lei(sumaFacturi)}, iar lista de plată repartizează ${lei(total)}. Diferența de ${lei(Math.abs(diferenta))} nu a ajuns la proprietari și rămâne în sarcina asociației.`,
    severitate: "ridicata",
    sursa: "regula",
    temei: null,
    probe: [
      { eticheta: "Total facturi", valoare: lei(sumaFacturi) },
      { eticheta: "Facturi luate în calcul", valoare: String(facturi.length) },
      { eticheta: "Total repartizat pe listă", valoare: lei(total) },
      { eticheta: "Nerepartizat", valoare: lei(Math.abs(diferenta)) },
    ],
    recomandare: "Identificarea cheltuielilor nerepartizate și includerea lor în lista lunii următoare.",
  }];
};

/* --------------------------------------------------------- RESTANTIERI */

const restanteNivel: Regula = ({ extras }) => {
  const restante = are(extras.restantieri.total) ? extras.restantieri.total : extras.lista.totalRestante;
  const cheltuieli = extras.lista.totalCheltuieli;
  if (!are(restante) || restante <= 0) return [];
  if (!are(cheltuieli) || cheltuieli <= 0) {
    return [{
      cod: "RESTANTE-NIVEL",
      titlu: "Există restanțe la plata cotelor",
      detaliu: `Restanțele înregistrate însumează ${lei(restante)}.`,
      severitate: "medie",
      sursa: "regula",
      temei: temei("l196_art55_1_o"),
      probe: [{ eticheta: "Total restanțe", valoare: lei(restante) }],
      recomandare: "Urmărirea recuperării creanțelor de către comitetul executiv.",
    }];
  }
  const raport = (restante / cheltuieli) * 100;
  if (raport < 15) return [];
  const severitate = raport >= 50 ? "critica" : raport >= 25 ? "ridicata" : "medie";
  const nivel = raport >= 50 ? "foarte ridicat" : raport >= 25 ? "ridicat" : "moderat";
  return [{
    cod: "RESTANTE-NIVEL",
    titlu: `Nivel ${nivel} al restanțelor`,
    detaliu: `Restanțele reprezintă ${proc(raport)} din cheltuielile lunii. La acest nivel, asociația își acoperă facturile curente din banii altor proprietari, ceea ce îi afectează echilibrul financiar.`,
    severitate,
    sursa: "regula",
    temei: temei("l196_art55_1_o"),
    probe: [
      { eticheta: "Total restanțe", valoare: lei(restante) },
      { eticheta: "Cheltuielile lunii", valoare: lei(cheltuieli) },
      { eticheta: "Pondere", valoare: proc(raport) },
      ...(extras.restantieri.apartamente.length > 0
        ? [{ eticheta: "Apartamente restante", valoare: String(extras.restantieri.apartamente.length) }]
        : []),
    ],
    recomandare: "Notificarea în scris a restanțierilor și, după caz, acțiune în instanță pentru sumele vechi.",
  }];
};

const restantePenalizari: Regula = ({ extras }) => {
  const restante = are(extras.restantieri.total) ? extras.restantieri.total : extras.lista.totalRestante;
  if (!are(restante) || restante <= 0) return [];
  if (extras.penalizari.aplicate !== false) return [];
  const vechi = extras.restantieri.apartamente.filter(a => are(a.luniIntarziere) && (a.luniIntarziere as number) >= 2);
  return [{
    cod: "RESTANTE-PENALIZARI",
    titlu: "Nu s-au aplicat penalizări pentru întârziere",
    detaliu: `Există restanțe de ${lei(restante)}, dar nu au fost calculate penalizări. Neaplicarea lor înseamnă că proprietarii care plătesc la timp îi finanțează pe ceilalți.`,
    severitate: vechi.length > 0 ? "ridicata" : "medie",
    sursa: "regula",
    temei: temei("l196_art77"),
    probe: [
      { eticheta: "Total restanțe", valoare: lei(restante) },
      { eticheta: "Penalizări calculate", valoare: "nu" },
      ...(vechi.length > 0 ? [{ eticheta: "Apartamente cu peste 2 luni întârziere", valoare: String(vechi.length) }] : []),
    ],
    recomandare: "Aplicarea penalizărilor conform hotărârii adunării generale, în limita prevăzută de lege.",
  }];
};

/* ---------------------------------------------------------- FURNIZORI */

const furnizoriNeachitat: Regula = ({ extras }) => {
  const neachitat = are(extras.furnizori.totalNeachitat)
    ? extras.furnizori.totalNeachitat
    : (() => {
        const restante = extras.furnizori.facturi.filter(f => f.achitata === false && are(f.suma));
        return restante.length > 0 ? restante.reduce((s, f) => s + (f.suma as number), 0) : null;
      })();
  if (!are(neachitat) || neachitat <= TOLERANTA_ROTUNJIRE_LEI) return [];

  const disponibil = [extras.casa.soldFinal, extras.banca.soldFinal].filter(are).reduce((s, v) => s + v, 0);
  const acoperit = disponibil >= neachitat;
  const neachitate = extras.furnizori.facturi.filter(f => f.achitata === false);

  return [{
    cod: "FURNIZORI-NEACHITAT",
    titlu: "Facturi neachitate către furnizori",
    detaliu: acoperit
      ? `Facturi de ${lei(neachitat)} sunt încă neachitate, deși asociația are disponibil ${lei(disponibil)} în casă și în bancă.`
      : `Facturi de ${lei(neachitat)} sunt neachitate, iar disponibilul din casă și bancă (${lei(disponibil)}) nu le acoperă. Asociația riscă penalități de la furnizori și, la utilități, debranșarea.`,
    severitate: acoperit ? "medie" : "ridicata",
    sursa: "regula",
    temei: null,
    probe: [
      { eticheta: "Total neachitat", valoare: lei(neachitat) },
      { eticheta: "Disponibil casă + bancă", valoare: lei(disponibil) },
      ...neachitate.slice(0, 6).map(f => ({
        eticheta: f.furnizor || "Furnizor",
        valoare: `${f.numar ? `factura ${f.numar} · ` : ""}${are(f.suma) ? lei(f.suma) : "sumă necitită"}`,
      })),
    ],
    recomandare: acoperit
      ? "Achitarea facturilor scadente din disponibilul existent."
      : "Prezentarea situației în adunarea generală și stabilirea unui plan de plată.",
  }];
};

const platiNumerar: Regula = ({ extras }) => {
  const cash = extras.furnizori.facturi.filter(
    f => f.modalitatePlata === "numerar" && are(f.suma) && (f.suma as number) > PLAFON_CASA_LEI,
  );
  if (cash.length === 0) return [];
  return [{
    cod: "FURNIZORI-NUMERAR",
    titlu: "Plăți către furnizori făcute în numerar peste plafon",
    detaliu: `${cash.length} ${cash.length === 1 ? "factură a fost achitată" : "facturi au fost achitate"} în numerar cu sume peste plafonul de casă. Plățile către furnizori se fac prin virament bancar, ca să rămână urmă în extras.`,
    severitate: "ridicata",
    sursa: "regula",
    temei: temei("l196_art67"),
    probe: cash.slice(0, 6).map(f => ({
      eticheta: f.furnizor || "Furnizor",
      valoare: `${are(f.suma) ? lei(f.suma) : "—"} în numerar`,
    })),
    recomandare: "Efectuarea plăților către furnizori exclusiv prin contul bancar al asociației.",
  }];
};

/* ------------------------------------------------------------- FONDURI */

const fondRulment: Regula = ({ extras }) => {
  const f = extras.fonduri.rulment;
  if (are(f) && f < 0) {
    return [{
      cod: "FOND-RULMENT-NEGATIV",
      titlu: "Fondul de rulment este negativ",
      detaliu: `Fondul de rulment are sold ${lei(f)}. Un fond negativ înseamnă că banii de rulment au fost consumați pentru alte cheltuieli.`,
      severitate: "critica",
      sursa: "regula",
      temei: temei("l196"),
      probe: [{ eticheta: "Sold fond de rulment", valoare: lei(f) }],
      recomandare: "Reconstituirea fondului de rulment în cuantumul hotărât de adunarea generală.",
    }];
  }
  if (f === 0) {
    return [{
      cod: "FOND-RULMENT-ZERO",
      titlu: "Fondul de rulment este epuizat",
      detaliu: "Fără fond de rulment, asociația nu poate plăti facturile înainte de a încasa cotele de la proprietari.",
      severitate: "medie",
      sursa: "regula",
      temei: temei("l196"),
      probe: [{ eticheta: "Sold fond de rulment", valoare: lei(0) }],
      recomandare: "Reconstituirea fondului de rulment din cotele lunii următoare.",
    }];
  }
  return [];
};

/* ------------------------------------------------------- IDENTIFICARE */

const identificareCui: Regula = ({ extras, cuiDeclarat }) => {
  const gasit = extras.identificare.cui;
  if (!gasit || !cuiDeclarat) return [];
  const curata = (s: string) => s.replace(/\D/g, "");
  if (!curata(gasit) || curata(gasit) === curata(cuiDeclarat)) return [];
  return [{
    cod: "IDENT-CUI",
    titlu: "Codul fiscal din documente diferă de cel din contul asociației",
    detaliu: "Documentele verificate poartă un cod fiscal diferit de cel înregistrat în platformă. Fie documentele aparțin altei asociații, fie datele contului sunt greșite.",
    severitate: "ridicata",
    sursa: "regula",
    temei: null,
    probe: [
      { eticheta: "CUI pe documente", valoare: gasit },
      { eticheta: "CUI în platformă", valoare: cuiDeclarat },
    ],
    recomandare: "Corectarea datelor de identificare înainte de emiterea raportului.",
  }];
};

const identificarePersoane: Regula = ({ extras }) => {
  const lipsa = [
    !extras.identificare.presedinte ? "președinte" : null,
    !extras.identificare.administrator ? "administrator" : null,
  ].filter(Boolean) as string[];
  if (lipsa.length === 0) return [];
  return [{
    cod: "IDENT-PERSOANE",
    titlu: "Documentele nu identifică persoanele responsabile",
    detaliu: `Din documentele primite nu reiese cine este ${lipsa.join(" și cine este ")}. Un raport de cenzor se adresează unor persoane cu nume, nu unei funcții goale.`,
    severitate: "scazuta",
    sursa: "regula",
    temei: null,
    probe: lipsa.map(l => ({ eticheta: l, valoare: "nu apare în documente" })),
    recomandare: "Completarea antetului documentelor cu numele persoanelor responsabile.",
  }];
};

/* ------------------------------------------------ INTEGRITATEA DOSARULUI */

const dosarIncomplet: Regula = ({ tipuriPrimite }) => {
  const lipsa = lipsuri(tipuriPrimite);
  if (lipsa.length === 0) return [];
  return [{
    cod: "DOSAR-INCOMPLET",
    titlu: "Dosarul nu conține toate documentele obligatorii",
    detaliu: `Lipsesc: ${lipsa.join(", ")}. Verificarea s-a făcut pe documentele existente, iar concluziile nu acoperă zonele pentru care lipsesc documente.`,
    severitate: "ridicata",
    sursa: "regula",
    temei: null,
    probe: lipsa.map(l => ({ eticheta: l, valoare: "lipsește din dosar" })),
    recomandare: "Completarea dosarului și reluarea verificării.",
  }];
};

const documenteNecitite: Regula = ({ extras }) => {
  if (extras.documenteProblematice.length === 0) return [];
  const n = extras.documenteProblematice.length;
  return [{
    cod: "DOC-ILIZIBIL",
    titlu: `${n} ${n === 1 ? "document nu a putut fi citit" : "documente nu au putut fi citite"}`,
    detaliu: "Documentele de mai jos nu au putut fi interpretate (scanare de calitate slabă, pagini lipsă sau format neașteptat). Constatările nu acoperă conținutul lor.",
    severitate: "medie",
    sursa: "regula",
    temei: null,
    probe: extras.documenteProblematice.map(d => ({ eticheta: eticheta(d.tip), valoare: d.problema })),
    recomandare: "Retrimiterea documentelor într-o scanare lizibilă, în format PDF.",
  }];
};

/* ------------------------------------------------------------------- */

const REGULI: Regula[] = [
  dosarIncomplet,
  documenteNecitite,
  identificareCui,
  casaPlafon,
  casaContinuitate,
  casaNegativa,
  bancaContinuitate,
  listaColoane,
  listaDataAfisarii,
  listaVsFacturi,
  restanteNivel,
  restantePenalizari,
  furnizoriNeachitat,
  platiNumerar,
  fondRulment,
  identificarePersoane,
];

export function aplicaReguli(ctx: ContextVerificare): Constatare[] {
  const rezultat: Constatare[] = [];
  for (const regula of REGULI) {
    try {
      rezultat.push(...regula(ctx));
    } catch (e) {
      // O regula care crapa nu are voie sa opreasca verificarea. Constatarile
      // celorlalte raman valabile; pe asta o semnalam ca sa se vada in raport
      // ca verificarea a fost partiala.
      console.error("[reguli] regulă eșuată:", e);
      rezultat.push({
        cod: "REGULA-ESUATA",
        titlu: "O verificare automată nu a putut fi efectuată",
        detaliu: "O regulă de verificare a întâmpinat o eroare internă. Zona acoperită de ea nu a fost verificată.",
        severitate: "info",
        sursa: "regula",
        temei: null,
        probe: [],
        recomandare: null,
      });
    }
  }
  return rezultat;
}

/**
 * Cate dintre cifrele pe care ne bazam au fost gasite in documente.
 *
 * Scorul singur minte: un dosar din care nu s-a putut citi nimic n-are
 * constatari, deci ar iesi „100%". De aceea scorul se afiseaza intotdeauna
 * alaturi de increderea in date.
 */
export function increderaDate(extras: ExtrasDosar): { procent: number; gasite: number; total: number } {
  const campuri: (number | string | boolean | null)[] = [
    extras.identificare.denumire, extras.identificare.cui, extras.identificare.presedinte,
    extras.identificare.administrator, extras.perioada.dataAfisarii,
    extras.casa.soldInitial, extras.casa.soldFinal, extras.casa.totalIncasari, extras.casa.totalPlati,
    extras.banca.soldInitial, extras.banca.soldFinal,
    extras.fonduri.rulment, extras.fonduri.reparatii,
    extras.lista.totalCheltuieli, extras.lista.areColoanaRestante,
    extras.restantieri.total,
    extras.furnizori.totalNeachitat,
    extras.penalizari.aplicate,
  ];
  const total = campuri.length + 2;
  let gasite = campuri.filter(c => c !== null && c !== undefined && c !== "").length;
  if (extras.furnizori.facturi.length > 0) gasite++;
  if (extras.lista.coloane.length > 0) gasite++;
  return { procent: Math.round((gasite / total) * 100), gasite, total };
}
