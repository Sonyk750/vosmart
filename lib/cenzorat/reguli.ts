import { Constatare, ExtrasDosar } from "./tipuri";
import { PLAFON_CASA_LEI, TOLERANTA_ROTUNJIRE_LEI, temei } from "./temeiuri";
import { faraDuplicate, type ProfilAsociatie } from "./istoric";
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
  /**
   * Ce stim despre asociatia asta din lunile ei de dinainte.
   *
   * Regulile nu trebuie sa o masoare dupa un ideal inventat de mine, ci dupa cum
   * lucreaza ea si dupa ce cere legea. La prima verificare istoricul e gol, si
   * atunci regulile care depind de el TAC — nu presupun.
   */
  istoric?: ProfilAsociatie | null;
  /** Datele din fisa asociatiei, ca sa se poata compara cu ce scrie pe documente. */
  cuiDeclarat: string | null;
  denumireDeclarata: string | null;
  /** Cheile de tip ale fisierelor primite in dosar. */
  tipuriPrimite: string[];
};

/**
 * Sub atat, o restanta nu merita nicio constatare.
 *
 * Doi bani ramasi dintr-o impartire pe apartamente nu sunt o restanta, sunt o
 * rotunjire. Pragul e ales sa lase afara exact asta si sa nu ascunda o datorie
 * adevarata: o cota lunara de intretinere e, oriunde in tara, peste el.
 */
const PRAG_RESTANTA_LEI = 50;

/**
 * De cand se pot aplica penalizari.
 *
 * Legea le ingaduie dupa scadenta, dar practica — confirmata de cenzor — e ca se
 * aplica dupa doua liste neplatite, adica in jur de 54 de zile. Numarul de LUNI
 * e ce putem masura din date: `luniIntarziere` vine din lista de plata.
 */
const LISTE_PANA_LA_PENALIZARE = 2;
const ZILE_PANA_LA_PENALIZARE = 54;

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

/**
 * Continuitatea soldului bancar — dar numai cand chiar se poate verifica.
 *
 * Doua greseli reparate aici, amandoua semnalate de cenzor:
 *
 * 1. Titlul spunea „nu corespunde cu extrasul", desi in dosar NU era niciun
 *    extras de cont. Regula compara registrul cu el insusi. O constatare n-are
 *    voie sa afirme ce n-a vazut.
 * 2. Cand asociatia are mai multe conturi — curent si colector — rulajele vin
 *    insumate de la toate, iar soldul final poate fi al unuia singur. Scaderea
 *    iese uriasa si complet falsa: la dosarul pe iunie a raportat 9.767 lei
 *    diferenta din nimic. Cu mai multe conturi si fara solduri pe fiecare,
 *    regula tace.
 */
const bancaContinuitate: Regula = ({ extras, tipuriPrimite }) => {
  const b = extras.banca;
  if (!are(b.soldInitial) || !are(b.soldFinal) || !are(b.totalIncasari) || !are(b.totalPlati)) return [];

  const conturi = b.conturi?.length ?? 0;
  const areExtras = tipuriPrimite.some(t => t === "extras_cont");

  // MAI MULTE CONTURI: cifrele de sus sunt insumate sau, mai rau, ale unuia
  // singur, iar continuitatea nu se poate socoti pe ele. La dosarul pe iunie
  // asociatia avea trei intrari de cont, iar soldul initial, rulajele si soldul
  // final erau toate ale contului curent — verificarea a raportat 9.767 lei
  // diferenta din nimic. Aici nu afirmam, spunem ce nu s-a putut face.
  if (conturi > 1) {
    return [{
      cod: "BANCA-NEVERIFICATA",
      titlu: "Continuitatea conturilor bancare nu a putut fi verificată",
      detaliu:
        `Asociația are ${conturi} conturi bancare, iar registrul nu dă soldul inițial, rulajele și soldul final `
        + "separat pentru fiecare. Fără ele, verificarea s-ar face pe cifre amestecate și ar da un rezultat fals."
        + (areExtras ? "" : " În dosar nu există nici extras de cont."),
      severitate: "info",
      sursa: "regula",
      temei: temei("ord1969"),
      probe: [
        { eticheta: "Conturi găsite", valoare: String(conturi) },
        ...(b.conturi ?? []).slice(0, 4).map(c => ({
          eticheta: c.iban ?? c.descriere.slice(0, 40),
          valoare: are(c.sold) ? lei(c.sold as number) : "sold necitit",
        })),
        { eticheta: "Extras de cont în dosar", valoare: areExtras ? "da" : "nu" },
      ],
      recomandare: "Solicitarea registrului de bancă pe fiecare cont în parte și a extraselor aferente.",
    }];
  }

  const asteptat = b.soldInitial + b.totalIncasari - b.totalPlati;
  const diferenta = b.soldFinal - asteptat;
  if (Math.abs(diferenta) <= TOLERANTA_ROTUNJIRE_LEI) return [];
  return [{
    cod: "BANCA-CONTINUITATE",
    titlu: "Rulajul din registrul de bancă nu duce la soldul final",
    detaliu:
      `Soldul inițial plus încasările minus plățile dau ${lei(asteptat)}, iar registrul raportează ${lei(b.soldFinal)}. `
      + `Diferența este de ${lei(Math.abs(diferenta))}. `
      + (areExtras
        ? "Se compară cu extrasul de cont, operațiune cu operațiune."
        : "ATENȚIE: în dosar nu există extras de cont, deci verificarea s-a făcut doar pe registru, cu cifrele lui. "
          + "Fără extras nu se poate spune care dintre cele două cifre este cea reală."),
    severitate: areExtras ? "ridicata" : "info",
    sursa: "regula",
    temei: temei("ord1969"),
    probe: [
      { eticheta: "Sold inițial", valoare: lei(b.soldInitial) },
      { eticheta: "Total încasări", valoare: lei(b.totalIncasari) },
      { eticheta: "Total plăți", valoare: lei(b.totalPlati) },
      { eticheta: "Sold final calculat", valoare: lei(asteptat) },
      { eticheta: "Sold final raportat", valoare: lei(b.soldFinal) },
      { eticheta: "Extras de cont în dosar", valoare: areExtras ? "da" : "NU — comparația cu banca nu s-a putut face" },
    ],
    recomandare: areExtras
      ? "Punctarea registrului de bancă cu extrasul de cont, operațiune cu operațiune."
      : "Solicitarea extrasului de cont pe luna verificată, fără de care registrul nu poate fi confruntat cu banca.",
  }];
};

/* ------------------------------------------------------- LISTA DE PLATA */

/**
 * Coloanele listei — dar numai cele care au ce sa arate.
 *
 * Regula cerea „penalizări" si „fond de rulment" pe orice lista. Cenzorul:
 * „atat timp cat in lista de plata nu se incaseaza fond de rulment sau alte
 * cheltuieli, ce are de ce sa apara in lista". Are dreptate — o coloana goala nu
 * ajuta pe nimeni, iar o constatare pentru lipsa ei e zgomot.
 *
 * Deci: restantele raman mereu obligatorii (legea cere sa se vada ce datorezi
 * din trecut). Penalizarile se cer doar daca s-au calculat penalizari; fondul de
 * rulment, doar daca s-a incasat ceva pe el. Iar daca asociatia a avut coloana
 * in lunile de dinainte si acum a disparut, asta se semnaleaza — nu ca lipsa
 * legala, ci ca schimbare fata de propria ei practica.
 */
const listaColoane: Regula = ({ extras, istoric }) => {
  const l = extras.lista;
  const lipsa: string[] = [];

  if (l.areColoanaRestante === false) lipsa.push("restanțe");

  // PENALIZARI: doar daca s-au APLICAT penalizari luna asta.
  //
  // Nu ne uitam la `penalizari.total`: acolo ajunge, de regula, SOLDUL fondului
  // de penalizari din situatia activ/pasiv — 2.212 lei stransi in ani. Un fond
  // care exista nu inseamna ca luna asta s-a calculat ceva de trecut pe lista.
  if (l.areColoanaPenalizari === false && extras.penalizari.aplicate === true) lipsa.push("penalizări");

  // FOND DE RULMENT: doar daca asociatia il incaseaza prin lista, adica daca
  // avea coloana in lunile de dinainte. Soldul fondului nu spune nimic despre
  // luna curenta — el sta acolo si cand nu se incaseaza nimic.
  const incaseazaRulment = (istoric?.coloaneObisnuite ?? []).some(c => /fond.*rulment/i.test(c));
  if (l.areColoanaFondRulment === false && incaseazaRulment) lipsa.push("fond de rulment");

  // Ce avea de obicei si acum nu mai are.
  const acum = new Set(l.coloane ?? []);
  const disparute = (istoric?.coloaneObisnuite ?? []).filter(c => !acum.has(c));

  if (lipsa.length === 0 && disparute.length === 0) return [];
  if (lipsa.length === 0) {
    return [{
      cod: "LISTA-COLOANE-SCHIMBATE",
      titlu: "Lista are altă structură decât în lunile de dinainte",
      detaliu: `Față de lunile verificate anterior, din listă lipsesc coloanele: ${disparute.join(", ")}. `
        + "Nu e neapărat o abatere — poate să nu fi fost nimic de trecut pe ele luna aceasta — dar merită confirmat.",
      severitate: "info",
      sursa: "regula",
      temei: null,
      probe: [
        { eticheta: "Coloane dispărute", valoare: disparute.join(", ") },
        { eticheta: "Luni comparate", valoare: String(istoric?.luni ?? 0) },
      ],
      recomandare: "Confirmarea că lipsa coloanelor e intenționată, nu o scăpare de formatare.",
    }];
  }
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

/**
 * Lista de plata fata de distribuirea facturilor.
 *
 * REGULA ASTA A FOST GRESITA SI A COSTAT INCREDERE. Aduna teancul de facturi din
 * dosar si il compara cu totalul listei. La dosarul pe iunie a iesit „facturi
 * 4.556 lei, lista 2.324 lei, nerepartizat 2.232 lei" — o acuzatie grea, si
 * complet falsa. Cenzorul: „aici ai gresit grav, nu ai citit facturile cum
 * trebuie".
 *
 * De ce era falsa, verificat pe datele extrase:
 *  - ACEEASI factura aparea de doua-trei ori. O factura sta in dosar in patru
 *    locuri — scanarea ei, distribuirea facturilor, registrul jurnal, registrul
 *    de banca — si fusese numarata din fiecare. Sapte facturi dublate, ~1.400 lei
 *    inventati din nimic;
 *  - intrasera facturi din ALTE LUNI, pana la una din august 2025;
 *  - comisioanele bancare ING figurau ca facturi de furnizor.
 *
 * Comparatia corecta exista deja in dosar, iar modelul o gasise singur si o
 * scrisese la neconcordante: documentul „Distribuirea facturilor" are un TOTAL,
 * si ACELA se compara cu totalul listei. Sunt doua documente despre aceeasi
 * repartizare; daca nu se potrivesc, e o problema reala.
 *
 * Cand distribuirea lipseste din dosar, regula nu mai improvizeaza cu teancul de
 * facturi. Spune ca nu a putut face verificarea si cere documentul.
 */
const listaVsDistributie: Regula = ({ extras, tipuriPrimite }) => {
  const total = extras.lista.totalCheltuieli;
  if (!are(total)) return [];

  const distribuit = extras.distributie?.total ?? null;
  const areDocument = tipuriPrimite.includes("distributia_facturilor");

  if (!are(distribuit)) {
    if (!areDocument) {
      return [{
        cod: "DISTRIBUTIE-LIPSA",
        titlu: "Lipsește distribuirea facturilor",
        detaliu:
          "Fără documentul de distribuire nu se poate verifica dacă totalul repartizat pe lista de plată "
          + "corespunde cu cheltuielile lunii. Suma facturilor din dosar NU ține locul lui: aceeași factură "
          + "apare în mai multe documente, iar în dosar intră și facturi din alte luni.",
        severitate: "medie",
        sursa: "regula",
        temei: null,
        probe: [{ eticheta: "Total pe lista de plată", valoare: lei(total) }],
        recomandare: "Solicitarea documentului „Distribuirea facturilor” pentru luna verificată.",
      }];
    }
    // Documentul e in dosar, dar totalul lui n-a putut fi citit. Nu inventam.
    return [];
  }

  const diferenta = total - distribuit;
  if (Math.abs(diferenta) <= TOLERANTA_ROTUNJIRE_LEI) return [];

  return [{
    cod: "LISTA-VS-DISTRIBUTIE",
    titlu: "Totalul listei nu se potrivește cu distribuirea facturilor",
    detaliu:
      `Distribuirea facturilor totalizează ${lei(distribuit)}, iar lista de plată repartizează ${lei(total)}. `
      + `Diferența este de ${lei(Math.abs(diferenta))}. Cele două documente descriu aceeași repartizare, `
      + "deci ar trebui să dea aceeași cifră.",
    severitate: Math.abs(diferenta) > 100 ? "ridicata" : "medie",
    sursa: "regula",
    temei: null,
    probe: [
      { eticheta: "Total distribuire facturi", valoare: lei(distribuit) },
      { eticheta: "Total repartizat pe listă", valoare: lei(total) },
      { eticheta: "Diferență", valoare: lei(Math.abs(diferenta)) },
    ],
    recomandare: "Punctarea listei de plată cu distribuirea facturilor, poziție cu poziție.",
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

/**
 * Penalizarile — dar numai cand chiar erau de aplicat.
 *
 * Regula veche semnala orice restanta, oricat de mica. La dosarul pe iunie a
 * iesit „nu s-au aplicat penalizari" pentru DOI BANI. Cenzorul: „nu aveai ce
 * penalitati sa aplici, penalitatile se aplica dupa 54 de zile de neplata, adica
 * doua liste, iar restanta este derizorie".
 *
 * Doua conditii, deci, si amandoua trebuie indeplinite:
 *  - restanta sa treaca de un prag sub care nu are rost sa vorbesti;
 *  - intarzierea sa fi depasit termenul de la care penalizarile se pot aplica.
 *    O restanta aparuta luna asta nu e inca penalizabila; abia una veche de doua
 *    liste este.
 *
 * Cand nu stim de cand dureaza restanta, regula TACE. E preferabil sa scape o
 * constatare decat sa se ceara cenzorului ceva ce legea nu-i cere.
 */
const restantePenalizari: Regula = ({ extras, istoric }) => {
  const restante = are(extras.restantieri.total) ? extras.restantieri.total : extras.lista.totalRestante;
  if (!are(restante) || restante <= PRAG_RESTANTA_LEI) return [];
  if (extras.penalizari.aplicate !== false) return [];

  // Cate apartamente au restanta mai veche decat termenul de la care se pot
  // aplica penalizari. Fara ele, n-avem pe ce sprijini constatarea.
  const vechi = extras.restantieri.apartamente.filter(
    a => are(a.luniIntarziere) && (a.luniIntarziere as number) >= LISTE_PANA_LA_PENALIZARE,
  );
  if (vechi.length === 0) return [];

  const cota = istoric?.cotaPenalizare ?? null;
  return [{
    cod: "RESTANTE-PENALIZARI",
    titlu: "Nu s-au aplicat penalizări pentru restanțe mai vechi de două liste",
    detaliu:
      `${vechi.length} ${vechi.length === 1 ? "apartament are" : "apartamente au"} restanțe mai vechi de `
      + `${LISTE_PANA_LA_PENALIZARE} liste (peste ${ZILE_PANA_LA_PENALIZARE} de zile), în total ${lei(restante)}, `
      + `dar nu s-au calculat penalizări.`
      + (cota !== null ? ` În lunile de dinainte asociația a aplicat ${cota}% pe zi de întârziere.` : ""),
    severitate: "medie",
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
        // Fara duplicate: aceeasi factura vine din mai multe documente si ar fi
        // fost numarata de doua ori si aici.
        const restante = faraDuplicate(extras.furnizori.facturi).filter(f => f.achitata === false && are(f.suma));
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

/**
 * Ce a observat modelul citind, si nicio regula n-a prins.
 *
 * Severitatea e „info", cu greutate zero: NU misca scorul. Cantarirea o fac
 * regulile, pe cifre, unde se poate reface calculul. Aici e vorba de piste —
 * uneori se suprapun peste o regula care a tras oricum (si atunci ar dubla
 * pedeapsa), alteori prind ceva ce nicio regula n-acopera, cum ar fi o lista de
 * plata afisata doar partial. Cenzorul decide ce face cu ele.
 */
const neconcordanteObservate: Regula = ({ extras }) => {
  if (extras.neconcordante.length === 0) return [];
  const n = extras.neconcordante.length;
  return [{
    cod: "AI-NECONCORDANTE",
    titlu: `${n} ${n === 1 ? "nepotrivire observată" : "nepotriviri observate"} între documente`,
    detaliu: "Observate la citirea documentelor, nu de o regulă de verificare. Nu intră în scor — unele se suprapun peste constatările de mai sus, altele merită urmărite separat.",
    severitate: "info",
    sursa: "ai",
    temei: null,
    probe: extras.neconcordante.map(x => ({ eticheta: x.despre, valoare: x.detaliu })),
    recomandare: null,
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
  listaVsDistributie,
  restanteNivel,
  restantePenalizari,
  furnizoriNeachitat,
  platiNumerar,
  fondRulment,
  identificarePersoane,
  // Ultima: e context pentru cenzor, nu o constatare de sine statatoare.
  neconcordanteObservate,
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
