import { Constatare, ExtrasDosar } from "./tipuri";
import { TOLERANTA_ROTUNJIRE_LEI, temei } from "./temeiuri";
import { tipDeBaza, eticheta } from "./documente";
import { LUNI } from "@/lib/luni";

/**
 * Verificarile de bani pe care un cenzor le face la fiecare luna si care lipseau:
 * banca fata de extras pe fiecare cont, factura cu factura in distribuire,
 * lista pe apartamente, fondurile, legatura cu luna trecuta, luna documentelor.
 *
 * Aceeasi regula ca in `reguli.ts`: fara AI aici, doar cifre comparate, cu
 * probele puse langa constatare. Si inca una, noua: cand o verificare DE BAZA nu
 * se poate face fiindca lipsesc cifrele, asta se spune (constatare
 * „NEVERIFICAT-…"). Inainte, regula tacea — iar un dosar din care se citise putin
 * iesea „Conform", fiindca n-avea constatari.
 */

export type ContextBani = {
  extras: ExtrasDosar;
  tipuriPrimite: string[];
  /** Documentele dosarului, cu perioada citita din ele la inventar. */
  documente?: { tip: string; numeFisier: string; perioadaAi: string | null }[];
  /** Luna si anul dosarului. */
  luna?: string;
  an?: number;
  /** Cifrele lunii precedente, din raportul ei SEMNAT. `null` = nu exista. */
  precedent?: ExtrasDosar | null;
};

/** Prefixul constatarilor care spun ca o verificare de baza nu s-a putut face. */
export const PREFIX_NEVERIFICAT = "NEVERIFICAT-";

/** Si codul vechi cu acelasi inteles, pastrat ca sa nu se rupa urmarirea de la o luna la alta. */
export function esteNeverificat(cod: string): boolean {
  return cod.startsWith(PREFIX_NEVERIFICAT) || cod === "BANCA-NEVERIFICATA";
}

const lei = (n: number) =>
  new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " lei";
const are = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const areDoc = (tipuri: string[], cheie: string) => tipuri.some(t => tipDeBaza(t) === cheie);
const cont = (iban: string | null, i: number) => iban ?? `contul ${i + 1}`;

/* ------------------------------------------------ BANCA FATA DE EXTRAS */

/**
 * Registrul de banca e tinut de administrator; extrasul il da banca. Cand soldul
 * din registru nu e cel din extras, banii scrisi in evidenta nu sunt in cont.
 * Se verifica pe FIECARE cont, pereche cu pereche, dupa IBAN.
 */
export function bancaVsExtras({ extras, tipuriPrimite }: ContextBani): Constatare[] {
  const extrase = extras.extrase ?? [];
  const conturi = extras.banca.conturi ?? [];
  const areRegistru = areDoc(tipuriPrimite, "registru_banca");
  const areExtrasDoc = areDoc(tipuriPrimite, "extras_cont");
  if (!areRegistru && !areExtrasDoc) return [];

  // Registrul pe conturi: din `conturi`; cand registrul are un singur cont si nu
  // l-a scris separat, cifrele lui sunt cele de sus.
  const registru = conturi.length > 0
    ? conturi.map(c => ({ iban: c.iban, soldInitial: c.soldInitial ?? null, soldFinal: c.sold }))
    : are(extras.banca.soldFinal)
      ? [{ iban: extras.identificare.iban, soldInitial: extras.banca.soldInitial, soldFinal: extras.banca.soldFinal }]
      : [];

  if (extrase.length === 0 || registru.length === 0) {
    return [{
      cod: `${PREFIX_NEVERIFICAT}BANCA-EXTRAS`,
      titlu: "Registrul de bancă nu a putut fi confruntat cu extrasul de cont",
      detaliu: extrase.length === 0
        ? (areExtrasDoc
          ? "Extrasul de cont e în dosar, dar soldurile de pe el nu au putut fi citite."
          : "În dosar nu există extras de cont. Fără el nu se poate spune dacă banii din registru sunt, de fapt, în bancă.")
        : "Soldurile din registrul de bancă nu au putut fi citite, deci nu au cu ce se compara cu extrasul.",
      severitate: "info",
      sursa: "regula",
      temei: temei("ord1969"),
      probe: [
        { eticheta: "Extrase citite", valoare: String(extrase.length) },
        { eticheta: "Conturi în registru", valoare: String(registru.length) },
      ],
      recomandare: "Solicitarea extrasului de cont pentru fiecare cont bancar al asociației, pe luna verificată.",
    }];
  }

  const rezultat: Constatare[] = [];
  const neperechi: string[] = [];

  registru.forEach((r, i) => {
    // Pereche dupa IBAN; cand exista un singur cont si un singur extras, sunt
    // aceeasi pereche chiar daca unul dintre ele nu are IBAN-ul scris.
    const x = r.iban
      ? extrase.find(e => e.iban === r.iban)
      : registru.length === 1 && extrase.length === 1 ? extrase[0] : undefined;
    if (!x) { neperechi.push(cont(r.iban, i)); return; }
    if (!are(r.soldFinal) || !are(x.soldFinal)) { neperechi.push(cont(r.iban, i)); return; }

    const dif = r.soldFinal - x.soldFinal;
    if (Math.abs(dif) <= TOLERANTA_ROTUNJIRE_LEI) return;
    rezultat.push({
      cod: "BANCA-VS-EXTRAS",
      titlu: `Soldul din registrul de bancă nu este cel din extras (${cont(r.iban, i)})`,
      detaliu:
        `Registrul de bancă arată la final de lună ${lei(r.soldFinal)}, iar extrasul băncii ${lei(x.soldFinal)}. `
        + `Diferența de ${lei(Math.abs(dif))} înseamnă ${dif > 0 ? "bani trecuți în evidență care nu sunt în cont" : "operațiuni din cont neînregistrate în evidență"}.`,
      severitate: "critica",
      sursa: "regula",
      temei: temei("ord1969"),
      probe: [
        { eticheta: "Cont", valoare: cont(r.iban, i) },
        { eticheta: "Sold final registru", valoare: lei(r.soldFinal) },
        { eticheta: "Sold final extras", valoare: lei(x.soldFinal) },
        { eticheta: "Diferență", valoare: lei(dif) },
      ],
      recomandare: "Punctarea registrului de bancă cu extrasul, operațiune cu operațiune, și înregistrarea diferenței.",
    });
  });

  if (neperechi.length > 0) {
    rezultat.push({
      cod: `${PREFIX_NEVERIFICAT}BANCA-CONT`,
      titlu: `${neperechi.length === 1 ? "Un cont nu a putut fi confruntat" : `${neperechi.length} conturi nu au putut fi confruntate`} cu extrasul`,
      detaliu: "Pentru aceste conturi nu s-a găsit extras de cont cu același IBAN, sau soldurile nu au putut fi citite.",
      severitate: "info",
      sursa: "regula",
      temei: null,
      probe: neperechi.map(c => ({ eticheta: "Cont", valoare: c })),
      recomandare: "Solicitarea extrasului pentru fiecare cont în parte. La extras, trecerea IBAN-ului pe document (câmpul „Cont” din inventar).",
    });
  }
  return rezultat;
}

/**
 * Rulajul pe FIECARE cont din registru: sold initial + incasari − plati = sold
 * final. Inainte, cu mai multe conturi regula tacea, fiindca avea doar cifre
 * amestecate; acum le are pe conturi.
 */
export function bancaContinuitatePeConturi({ extras }: ContextBani): Constatare[] {
  const conturi = (extras.banca.conturi ?? []).filter(c =>
    are(c.soldInitial) && are(c.totalIncasari) && are(c.totalPlati) && are(c.sold));
  if ((extras.banca.conturi ?? []).length < 2) return [];
  const rezultat: Constatare[] = [];
  conturi.forEach((c, i) => {
    const asteptat = (c.soldInitial as number) + (c.totalIncasari as number) - (c.totalPlati as number);
    const dif = (c.sold as number) - asteptat;
    if (Math.abs(dif) <= TOLERANTA_ROTUNJIRE_LEI) return;
    rezultat.push({
      cod: "BANCA-CONTINUITATE-CONT",
      titlu: `Rulajul contului ${cont(c.iban, i)} nu duce la soldul final`,
      detaliu: `Soldul inițial plus încasările minus plățile dau ${lei(asteptat)}, iar registrul raportează ${lei(c.sold as number)}. Diferența este de ${lei(Math.abs(dif))}.`,
      severitate: "ridicata",
      sursa: "regula",
      temei: temei("ord1969"),
      probe: [
        { eticheta: "Sold inițial", valoare: lei(c.soldInitial as number) },
        { eticheta: "Încasări", valoare: lei(c.totalIncasari as number) },
        { eticheta: "Plăți", valoare: lei(c.totalPlati as number) },
        { eticheta: "Sold final calculat", valoare: lei(asteptat) },
        { eticheta: "Sold final raportat", valoare: lei(c.sold as number) },
      ],
      recomandare: "Refacerea registrului de bancă pe contul respectiv.",
    });
  });
  return rezultat;
}

/* --------------------------------------------- DISTRIBUIREA, RAND CU RAND */

const numarCurat = (n: string | null) => (n ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^0+/, "");

export function distributieFacturi({ extras, tipuriPrimite }: ContextBani): Constatare[] {
  const randuri = extras.distributie.facturi ?? [];
  if (randuri.length === 0) return [];
  const rezultat: Constatare[] = [];

  // Aceeasi factura de doua ori in distribuire = platita de doua ori de proprietari.
  const vazute = new Map<string, number>();
  for (const r of randuri) {
    const k = `${(r.furnizor || "").toLowerCase()}|${numarCurat(r.numar)}`;
    if (!numarCurat(r.numar)) continue;
    vazute.set(k, (vazute.get(k) ?? 0) + 1);
  }
  const duble = randuri.filter(r => numarCurat(r.numar) && (vazute.get(`${(r.furnizor || "").toLowerCase()}|${numarCurat(r.numar)}`) ?? 0) > 1);
  if (duble.length > 0) {
    rezultat.push({
      cod: "DISTRIBUTIE-DUBLA",
      titlu: "Aceeași factură apare de mai multe ori în distribuire",
      detaliu: "O factură distribuită de două ori pe listă înseamnă că proprietarii o plătesc de două ori.",
      severitate: "critica",
      sursa: "regula",
      temei: null,
      probe: duble.slice(0, 8).map(r => ({ eticheta: r.furnizor || "Furnizor", valoare: `factura ${r.numar}${are(r.sumaDistribuita) ? ` · ${lei(r.sumaDistribuita)}` : ""}` })),
      recomandare: "Eliminarea distribuirii duble și recalcularea listei.",
    });
  }

  // Distribuit PESTE valoarea facturii: bani ceruti proprietarilor fara acoperire.
  const peste = randuri.filter(r => are(r.sumaFactura) && are(r.sumaDistribuita) && (r.sumaDistribuita as number) - (r.sumaFactura as number) > TOLERANTA_ROTUNJIRE_LEI);
  if (peste.length > 0) {
    const total = peste.reduce((s, r) => s + (r.sumaDistribuita as number) - (r.sumaFactura as number), 0);
    rezultat.push({
      cod: "DISTRIBUTIE-PESTE-FACTURA",
      titlu: "S-a distribuit mai mult decât valoarea facturii",
      detaliu: `La ${peste.length} ${peste.length === 1 ? "factură" : "facturi"} suma repartizată pe listă depășește valoarea facturii, în total cu ${lei(total)}. Diferența o plătesc proprietarii fără să existe cheltuiala.`,
      severitate: "critica",
      sursa: "regula",
      temei: null,
      probe: peste.slice(0, 8).map(r => ({
        eticheta: `${r.furnizor || "Furnizor"}${r.numar ? ` · ${r.numar}` : ""}`,
        valoare: `factură ${lei(r.sumaFactura as number)}, distribuit ${lei(r.sumaDistribuita as number)}`,
      })),
      recomandare: "Corectarea distribuirii la valoarea facturii și restituirea diferenței pe lista următoare.",
    });
  }

  // Distribuit SUB valoare: poate fi legitim (factura repartizata pe mai multe
  // luni), deci e observatie de verificat, nu acuzatie.
  const sub = randuri.filter(r => are(r.sumaFactura) && are(r.sumaDistribuita) && (r.sumaFactura as number) - (r.sumaDistribuita as number) > TOLERANTA_ROTUNJIRE_LEI);
  if (sub.length > 0) {
    rezultat.push({
      cod: "DISTRIBUTIE-PARTIALA",
      titlu: "Facturi distribuite doar parțial pe lista lunii",
      detaliu: "Suma repartizată e mai mică decât valoarea facturii. E corect doar dacă factura se împarte pe mai multe luni sau o parte se plătește din fonduri — de confirmat cu administratorul.",
      severitate: "medie",
      sursa: "regula",
      temei: null,
      probe: sub.slice(0, 8).map(r => ({
        eticheta: `${r.furnizor || "Furnizor"}${r.numar ? ` · ${r.numar}` : ""}`,
        valoare: `factură ${lei(r.sumaFactura as number)}, distribuit ${lei(r.sumaDistribuita as number)}`,
      })),
      recomandare: "Confirmarea modului de repartizare pentru restul sumei.",
    });
  }

  // Distribuita, dar fara factura in dosar.
  if (areDoc(tipuriPrimite, "facturi") && extras.furnizori.facturi.length > 0) {
    const inDosar = new Set(extras.furnizori.facturi.map(f => numarCurat(f.numar)).filter(Boolean));
    const fara = randuri.filter(r => numarCurat(r.numar) && !inDosar.has(numarCurat(r.numar)));
    if (fara.length > 0) {
      rezultat.push({
        cod: "DISTRIBUTIE-FARA-FACTURA",
        titlu: "Facturi distribuite care nu sunt în dosar",
        detaliu: "Pentru aceste poziții din distribuire nu s-a găsit factura în documentele primite. Fără factură nu se poate confirma că cheltuiala există și are valoarea distribuită.",
        severitate: "medie",
        sursa: "regula",
        temei: null,
        probe: fara.slice(0, 8).map(r => ({ eticheta: r.furnizor || "Furnizor", valoare: `factura ${r.numar}${are(r.sumaDistribuita) ? ` · ${lei(r.sumaDistribuita)}` : ""}` })),
        recomandare: "Solicitarea facturilor lipsă.",
      });
    }
  }
  return rezultat;
}

/* ------------------------------------------------- LISTA, PE APARTAMENTE */

export function listaPeApartamente({ extras, tipuriPrimite }: ContextBani): Constatare[] {
  if (!areDoc(tipuriPrimite, "lista_plata")) return [];
  const aps = (extras.lista.apartamente ?? []).filter(a => are(a.totalDePlata));
  const total = extras.lista.totalDePlata ?? null;
  const asteptate = extras.lista.numarApartamente;

  // Daca modelul n-a intors toate apartamentele, suma lor n-are cum sa dea
  // totalul — iar o diferenta de aici ar fi o acuzatie falsa.
  const complet = aps.length > 0 && (!are(asteptate) || aps.length >= asteptate);
  if (!are(total) || !complet) {
    return [{
      cod: `${PREFIX_NEVERIFICAT}LISTA-APARTAMENTE`,
      titlu: "Totalul listei nu a putut fi verificat pe apartamente",
      detaliu: !are(total)
        ? "Rândul TOTAL al coloanei „Total de plată” nu a putut fi citit de pe listă."
        : `Au fost citite ${aps.length} apartamente${are(asteptate) ? ` din ${asteptate}` : ""}; suma lor nu se poate compara cu totalul.`,
      severitate: "info",
      sursa: "regula",
      temei: null,
      probe: [
        { eticheta: "Apartamente citite", valoare: String(aps.length) },
        { eticheta: "Total de plată pe listă", valoare: are(total) ? lei(total) : "necitit" },
      ],
      recomandare: "Verificarea manuală a însumării listei.",
    }];
  }

  const suma = aps.reduce((s, a) => s + (a.totalDePlata as number), 0);
  const dif = total - suma;
  if (Math.abs(dif) <= TOLERANTA_ROTUNJIRE_LEI) return [];
  return [{
    cod: "LISTA-SUMA-APARTAMENTE",
    titlu: "Totalul listei nu este suma apartamentelor",
    detaliu: `Suma sumelor de plată pe apartamente este ${lei(suma)}, iar rândul TOTAL al listei arată ${lei(total)}. Diferența de ${lei(Math.abs(dif))} nu e repartizată pe niciun apartament sau e repartizată în plus.`,
    severitate: "ridicata",
    sursa: "regula",
    temei: temei("l196_art54"),
    probe: [
      { eticheta: "Suma pe apartamente", valoare: lei(suma) },
      { eticheta: "Total pe listă", valoare: lei(total) },
      { eticheta: "Apartamente", valoare: String(aps.length) },
      { eticheta: "Diferență", valoare: lei(dif) },
    ],
    recomandare: "Refacerea însumării listei de plată.",
  }];
}

/* ------------------------------------------------------------- FONDURI */

export function fonduriContinuitate({ extras, tipuriPrimite }: ContextBani): Constatare[] {
  const miscari = extras.fonduri.miscari ?? [];
  if (miscari.length === 0) {
    if (!areDoc(tipuriPrimite, "registru_fond")) return [];
    return [{
      cod: `${PREFIX_NEVERIFICAT}FONDURI`,
      titlu: "Mișcarea fondurilor nu a putut fi verificată",
      detaliu: "Registrul de fonduri e în dosar, dar soldurile și mișcările fondurilor nu au putut fi citite.",
      severitate: "info",
      sursa: "regula",
      temei: null,
      probe: [],
      recomandare: "Verificarea manuală a registrului de fonduri.",
    }];
  }
  const rezultat: Constatare[] = [];
  for (const m of miscari) {
    if (!are(m.soldInitial) || !are(m.incasari) || !are(m.cheltuieli) || !are(m.soldFinal)) continue;
    const asteptat = m.soldInitial + m.incasari - m.cheltuieli;
    const dif = m.soldFinal - asteptat;
    if (Math.abs(dif) <= TOLERANTA_ROTUNJIRE_LEI) continue;
    rezultat.push({
      cod: "FOND-CONTINUITATE",
      titlu: `Fondul „${m.fond}” nu se închide`,
      detaliu: `Sold inițial plus încasări minus cheltuieli dau ${lei(asteptat)}, iar registrul raportează ${lei(m.soldFinal)}. Diferența de ${lei(Math.abs(dif))} e o mișcare neînregistrată sau o eroare de calcul.`,
      severitate: "critica",
      sursa: "regula",
      temei: temei("l196"),
      probe: [
        { eticheta: "Sold inițial", valoare: lei(m.soldInitial) },
        { eticheta: "Încasări", valoare: lei(m.incasari) },
        { eticheta: "Cheltuieli", valoare: lei(m.cheltuieli) },
        { eticheta: "Sold final calculat", valoare: lei(asteptat) },
        { eticheta: "Sold final raportat", valoare: lei(m.soldFinal) },
      ],
      recomandare: "Refacerea registrului fondului și identificarea mișcării lipsă.",
    });
  }
  return rezultat;
}

/* ---------------------------------------------- LEGATURA CU LUNA TRECUTA */

/**
 * Soldul final de luna trecuta trebuie sa fie soldul initial de luna aceasta.
 * Luna trecuta se ia din raportul ei SEMNAT — cifra pe care s-a pus deja o
 * semnatura, nu o citire nesemnata.
 */
export function continuitateLuni({ extras, precedent }: ContextBani): Constatare[] {
  if (!precedent) return [];
  const rezultat: Constatare[] = [];
  const perechi: { zona: string; inainte: number | null | undefined; acum: number | null | undefined; sev: "critica" | "ridicata" }[] = [
    { zona: "Casa", inainte: precedent.casa.soldFinal, acum: extras.casa.soldInitial, sev: "critica" },
  ];

  const conturiInainte = precedent.banca.conturi ?? [];
  const conturiAcum = extras.banca.conturi ?? [];
  if (conturiInainte.length > 0 && conturiAcum.length > 0) {
    for (const c of conturiAcum) {
      const v = c.iban ? conturiInainte.find(x => x.iban === c.iban) : undefined;
      if (v) perechi.push({ zona: `Bancă ${c.iban}`, inainte: v.sold, acum: c.soldInitial, sev: "ridicata" });
    }
  } else {
    perechi.push({ zona: "Bancă", inainte: precedent.banca.soldFinal, acum: extras.banca.soldInitial, sev: "ridicata" });
  }

  for (const m of extras.fonduri.miscari ?? []) {
    const v = (precedent.fonduri.miscari ?? []).find(x => x.fond.toLowerCase() === m.fond.toLowerCase());
    if (v) perechi.push({ zona: `Fond ${m.fond}`, inainte: v.soldFinal, acum: m.soldInitial, sev: "ridicata" });
  }

  for (const p of perechi) {
    if (!are(p.inainte) || !are(p.acum)) continue;
    const dif = p.acum - p.inainte;
    if (Math.abs(dif) <= TOLERANTA_ROTUNJIRE_LEI) continue;
    rezultat.push({
      cod: "CONTINUITATE-LUNA",
      titlu: `${p.zona}: soldul inițial nu e soldul final de luna trecută`,
      detaliu: `Luna trecută (raport semnat) s-a încheiat cu ${lei(p.inainte)}, iar luna aceasta pornește de la ${lei(p.acum)}. Diferența de ${lei(Math.abs(dif))} a apărut între luni, fără nicio operațiune care s-o explice.`,
      severitate: p.sev,
      sursa: "regula",
      temei: temei("ord1969"),
      probe: [
        { eticheta: "Sold final luna trecută", valoare: lei(p.inainte) },
        { eticheta: "Sold inițial luna curentă", valoare: lei(p.acum) },
        { eticheta: "Diferență", valoare: lei(dif) },
      ],
      recomandare: "Explicarea diferenței dintre luni de către administrator, cu documente.",
    });
  }
  return rezultat;
}

/* ------------------------------------------------ LUNA DOCUMENTELOR */

const faraDiacritice = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Luna si anul dintr-o perioada scrisa liber („iunie 2026", „06/2026"). null daca nu e una singura. */
export function lunaDin(perioada: string | null): { luna: number; an: number | null } | null {
  if (!perioada) return null;
  const t = faraDiacritice(perioada);
  const nume = LUNI.map((l, i) => ({ i: i + 1, l })).filter(x => new RegExp(`\\b${x.l}\\b`).test(t));
  const an = /\b(20\d{2})\b/.exec(t)?.[1];
  if (nume.length === 1) return { luna: nume[0].i, an: an ? Number(an) : null };
  if (nume.length > 1) return null;
  const numeric = /\b(0?[1-9]|1[0-2])[./-](20\d{2})\b/.exec(t);
  return numeric ? { luna: Number(numeric[1]), an: Number(numeric[2]) } : null;
}

/** Documentele care descriu LUNA insasi. Facturile pot fi, legitim, din luna de dinainte. */
const PE_LUNA = ["lista_plata", "explicatii_lista", "distributia_facturilor", "registru_casa", "registru_banca", "registru_fond", "extras_cont"];

export function documenteDinAltaLuna({ documente, luna, an }: ContextBani): Constatare[] {
  if (!documente || !luna || !an) return [];
  const lunaNr = LUNI.indexOf(luna.toLowerCase() as (typeof LUNI)[number]) + 1;
  if (lunaNr === 0) return [];
  const straine = documente.filter(d => {
    if (!PE_LUNA.includes(tipDeBaza(d.tip))) return false;
    const p = lunaDin(d.perioadaAi);
    return p && (p.luna !== lunaNr || (p.an !== null && p.an !== an));
  });
  if (straine.length === 0) return [];
  return [{
    cod: "DOC-ALTA-LUNA",
    titlu: "Documente care par a fi din altă lună",
    detaliu: `Dosarul este pe ${luna} ${an}, dar perioada scrisă pe documentele de mai jos este alta. Cifrele lor nu descriu luna verificată.`,
    severitate: "medie",
    sursa: "regula",
    temei: null,
    probe: straine.slice(0, 8).map(d => ({ eticheta: `${eticheta(d.tip)} · ${d.numeFisier}`, valoare: d.perioadaAi ?? "" })),
    recomandare: "Înlocuirea documentelor cu cele ale lunii verificate, sau corectarea lunii dosarului.",
  }];
}

/* ------------------------------------------ ACOPERIREA VERIFICARILOR */

/**
 * Verificarile de baza care n-au avut pe ce se face, desi documentul era in
 * dosar. Fiecare iese ca „NEVERIFICAT-…", iar verdictul nu mai poate fi
 * „Conform" cat timp exista una (vezi scor.ts).
 */
export function acoperire({ extras, tipuriPrimite }: ContextBani, incredere: number): Constatare[] {
  const r: Constatare[] = [];
  const neverificat = (zona: string, titlu: string, detaliu: string): Constatare => ({
    cod: `${PREFIX_NEVERIFICAT}${zona}`, titlu, detaliu,
    severitate: "info", sursa: "regula", temei: null, probe: [],
    recomandare: "Retrimiterea documentului într-o formă lizibilă, sau verificarea manuală a zonei.",
  });

  const c = extras.casa;
  if (areDoc(tipuriPrimite, "registru_casa") && [c.soldInitial, c.soldFinal, c.totalIncasari, c.totalPlati].some(v => !are(v))) {
    r.push(neverificat("CASA", "Registrul de casă nu a putut fi verificat complet",
      "Soldul inițial, încasările, plățile sau soldul final nu au putut fi citite din registrul de casă; continuitatea casei nu s-a verificat."));
  }
  if (areDoc(tipuriPrimite, "distributia_facturilor") && !are(extras.distributie.total)) {
    r.push(neverificat("DISTRIBUTIE", "Totalul distribuirii facturilor nu a putut fi citit",
      "Documentul de distribuire e în dosar, dar totalul lui nu a putut fi citit; lista nu s-a putut compara cu distribuirea."));
  }
  if (areDoc(tipuriPrimite, "lista_plata") && !are(extras.lista.totalCheltuieli)) {
    r.push(neverificat("LISTA", "Totalul listei de plată nu a putut fi citit",
      "Fără totalul listei, verificările listei (față de distribuire, restanțe) nu s-au putut face."));
  }
  if (incredere < 55) {
    r.push({
      ...neverificat("DATE", "Prea puține date citite din documente",
        `Din documente s-au putut citi doar ${incredere}% din indicatorii așteptați. Lipsa constatărilor nu înseamnă că dosarul e în regulă — înseamnă că nu s-a putut verifica.`),
      probe: [{ eticheta: "Încredere date", valoare: `${incredere}%` }],
    });
  }
  return r;
}
