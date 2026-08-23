import Anthropic from "@anthropic-ai/sdk";
import { EXTRAS_GOL, ExtrasDosar } from "./tipuri";
import { eticheta, tipDeBaza } from "./documente";
import { citesteOffice, esteOffice, LIMITA_VERIFICARE } from "./office";

/**
 * Citirea documentelor din dosar.
 *
 * Aici se schimba cel mai mult fata de varianta veche. Inainte ceream modelului
 * sa scrie direct raportul, in proza, dupa un sablon de doua pagini — si pe urma
 * scoteam cifrele din text cu expresii regulate. Orice abatere de la sablon
 * insemna scor gresit sau constatari pierdute.
 *
 * Acum modelul are o singura sarcina: sa CITEASCA si sa intoarca cifre, intr-o
 * forma fixa. Ce se face cu cifrele — constatari, scor, raport — se intampla in
 * cod, in `reguli.ts`, unde se poate citi si verifica.
 *
 * De ce NU folosim `strict: true` pe schema uneltei, desi ar parea locul lui:
 * API-ul compileaza schemele stricte intr-o gramatica si are un plafon de 16
 * parametri cu uniuni SI 16 optionali. Aici sunt vreo cincizeci de campuri care
 * pot lipsi, fiindca „nu scrie in documente" e un raspuns valid pentru fiecare;
 * cererea se intoarce cu 400 inainte sa plece vreun document. Singura cale de a
 * incapea sub plafon ar fi sa cerem modelului o valoare pentru fiecare camp —
 * exact lucrul de care ne ferim.
 *
 * Deci verificarea formei se face aici, in `curataExtras`, si e mai stricta
 * decat ar fi fost cea din API: nu doar ca respinge ce nu e numar, dar
 * intelege si „18.450,00 lei" sau „(500,00)" — forme pe care o schema le-ar fi
 * refuzat, obligand modelul sa ghiceasca a doua oara.
 *
 * Regula de aur din prompt: ce nu scrie in documente ramane `null`. Un model
 * care „completeaza" un sold lipsa cu o valoare plauzibila e mai periculos decat
 * unul care spune ca nu stie — pentru ca raportul se semneaza.
 */

/**
 * Modelul folosit la citire.
 *
 * Aici nu se face economie: o cifra citita gresit dintr-un registru de casa
 * ajunge intr-un raport semnat de cenzor. Se poate schimba din variabila de
 * mediu daca se doreste alt echilibru cost/acuratete.
 */
const MODEL = process.env.VOSMART_MODEL_EXTRAGERE || "claude-opus-5";

/** Formatele pe care modelul le poate chiar VEDEA, ca pagina. */
const MIME_CITIBILE = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/**
 * Ce poate intra in verificare, sub orice forma.
 *
 * Word si Excel nu se pot arata modelului ca pagina, dar sunt arhive cu XML
 * inauntru: din ele se scoate textul, cu tot cu cifrele din foaia de calcul.
 * Pana acum treceau drept „format care nu poate fi citit", ceea ce insemna ca la
 * o asociatie care isi tine registrul de casa in Excel raportul se dadea FARA
 * registrul de casa. Vezi `lib/cenzorat/office.ts`.
 */
const sePoateCiti = (mimeType: string) => MIME_CITIBILE.includes(mimeType) || esteOffice(mimeType);

export type FisierDeCitit = {
  tip: string;
  numeFisier: string;
  mimeType: string;
  continut: Buffer;
};

/**
 * Schema ramane in cerere ca indrumar pentru model — doar ca nu mai e compilata
 * de API, deci poate fi cat de mare are nevoie treaba.
 */
const optional = (tip: string, descriere?: string) => ({
  type: [tip, "null"],
  ...(descriere ? { description: descriere } : {}),
});

const nr = optional("number");
const txt = optional("string");
const bool = optional("boolean");

function obiect(proprietati: Record<string, unknown>) {
  return {
    type: "object",
    properties: proprietati,
    required: Object.keys(proprietati),
    additionalProperties: false,
  };
}

const SCHEMA_EXTRAS = obiect({
  identificare: obiect({
    denumire: txt, cui: txt, adresa: txt, iban: txt, banca: txt,
    presedinte: txt, administrator: txt, cenzor: txt,
  }),
  perioada: obiect({
    luna: txt, an: nr,
    dataAfisarii: optional("string", "Data afișării listei la avizier, în format ZZ.LL.AAAA, exact cum apare pe document."),
    dataScadenta: txt,
  }),
  casa: obiect({
    soldInitial: nr, soldFinal: nr, totalIncasari: nr, totalPlati: nr,
    primaChitanta: obiect({ numar: txt, suma: nr }),
    ultimaChitanta: obiect({ numar: txt, suma: nr }),
    soldMaximZilnic: optional("number", "Cel mai mare sold de casă dintr-o singură zi din registru. null dacă registrul nu arată solduri zilnice."),
    zileCuIncasari: nr,
  }),
  banca: obiect({
    soldInitial: nr, soldFinal: nr, totalIncasari: nr, totalPlati: nr,
    conturi: {
      type: "array",
      items: obiect({ iban: txt, descriere: { type: "string" }, sold: nr }),
    },
  }),
  distributie: obiect({
    total: optional("number", "TOTALUL general din documentul „Distribuirea facturilor” al lunii verificate — cifra de la rândul TOTAL, nu suma facturilor scanate."),
    perioada: optional("string", "Luna la care se referă documentul de distribuire, așa cum scrie pe el."),
  }),
  fonduri: obiect({
    rulment: nr, reparatii: nr, penalitati: nr,
    altele: { type: "array", items: obiect({ denumire: { type: "string" }, sold: nr }) },
  }),
  lista: obiect({
    totalCheltuieli: optional("number", "Totalul general repartizat pe lista de plată a lunii."),
    totalRestante: nr,
    numarApartamente: nr,
    coloane: { type: "array", items: { type: "string" }, description: "Denumirile coloanelor listei, în ordinea în care apar." },
    areColoanaRestante: bool,
    areColoanaPenalizari: bool,
    areColoanaFondRulment: bool,
  }),
  restantieri: obiect({
    total: nr,
    apartamente: {
      type: "array",
      items: obiect({ apartament: { type: "string" }, suma: { type: "number" }, luniIntarziere: nr }),
    },
  }),
  furnizori: obiect({
    facturi: {
      type: "array",
      items: obiect({
        furnizor: { type: "string" }, numar: txt, data: txt, suma: nr,
        achitata: bool,
        modalitatePlata: {
          type: ["string", "null"],
          enum: ["banca", "numerar", null],
          description: "Cum a fost achitată factura, doar dacă reiese explicit din document.",
        },
      }),
    },
    totalNeachitat: nr,
  }),
  penalizari: obiect({ aplicate: bool, cotaZilnica: nr, total: nr }),
  salarii: obiect({ exista: bool, total: nr }),
  documenteProblematice: {
    type: "array",
    description: "DOAR documente care nu au putut fi citite. Nepotrivirile între documente citite corect merg în neconcordante.",
    items: obiect({
      tip: { type: "string", description: "Cheia tipului de document, așa cum a fost primită." },
      problema: { type: "string", description: "Pe scurt, de ce nu s-a putut citi." },
    }),
  },
  neconcordante: {
    type: "array",
    description: "Nepotriviri între documente care s-au citit corect (o sumă care apare diferit în două locuri, un total care nu se închide, o listă afișată parțial).",
    items: obiect({
      despre: { type: "string", description: "Ce anume nu se potrivește, în câteva cuvinte." },
      detaliu: { type: "string", description: "Cifrele care nu se potrivesc și unde apar fiecare." },
    }),
  },
});

const INSTRUCTIUNI = `Ești asistentul de verificare al unei firme de cenzorat pentru asociații de proprietari din România.

Sarcina ta este să CITEȘTI documentele atașate și să întorci cifrele din ele. Nu întocmi un raport, nu formula concluzii, nu da recomandări — altcineva face asta din datele pe care le întorci tu.

Reguli, în ordinea importanței:

0. FIECARE FACTURĂ O SINGURĂ DATĂ. Aceeași factură apare, în mod normal, în trei-patru locuri: factura scanată, „Distribuirea facturilor", registrul jurnal, registrul de bancă. Este UN SINGUR document justificativ, deci intră o singură dată în listă, cu numărul lui. Nu o repeta pentru că ai văzut-o din nou; completează-i câmpurile lipsă din locul în care apare mai complet. Comisioanele bancare NU sunt facturi de furnizor.

1. Ce nu scrie în documente rămâne null. Nu deduce, nu calcula ce n-ai văzut, nu completa cu o valoare plauzibilă. Un câmp null este un răspuns corect și util; o cifră inventată ajunge într-un raport semnat de cenzor și îl compromite.
2. Sumele se întorc ca numere, în lei, cu punct zecimal (1234.56), fără separator de mii și fără simbol de monedă. Sumele scrise între paranteze sau cu semnul minus sunt negative.
3. Dacă același indicator apare în două documente cu valori diferite, întoarce valoarea din documentul primar (registrul, nu recapitulația) și descrie diferența în neconcordante.

3b. NU RAPORTA DIFERENȚELE DE ROTUNJIRE. O cheltuială împărțită pe apartamente cu două zecimale nu se mai adună exact la loc: 605,00 lei pe factură devine 604,99 lei pe listă, 90,00 devine 89,99, 856,00 devine 855,99. Sub 1 leu diferență între același element din două documente este rotunjire din împărțire, nu neconcordanță — treci mai departe fără să o menționezi. Semnalează doar diferențele care nu se pot explica așa. Tot acolo pun și totalurile care nu se închid sau listele afișate parțial. Nu le pune în documenteProblematice: acele documente s-au citit, doar că nu se potrivesc între ele.
4. documenteProblematice este exclusiv pentru documente pe care NU le-ai putut citi — scanare proastă, pagini lipsă, format neașteptat, conținut care nu corespunde numelui. Nu ghici conținutul lor.
5. La restanțieri, întoarce apartamentele individual, cu numărul așa cum apare pe listă. Dacă lista are zeci de apartamente restante, întoarce-le pe toate.
6. modalitatePlata se completează doar când reiese explicit din document (mențiune de virament, ordin de plată, chitanță de casă). Altfel null.
7. Diferențele sub 0,50 lei sunt rotunjiri și nu se semnalează.`;

/**
 * Cate pagini de document trimitem intr-o cerere. Un dosar cu 40 de facturi
 * scanate depaseste si limita de marime a cererii, si rabdarea oricui asteapta
 * raspunsul, asa ca il taiem in transe si imbinam rezultatele.
 */
const MAX_FISIERE_PE_CERERE = 12;

/* ---------------------------------------------------- CURATAREA RASPUNSULUI */

/**
 * Numar din ce a intors modelul.
 *
 * Nu ne bazam pe faptul ca a respectat instructiunea „punct zecimal, fara
 * separator de mii": documentele romanesti scriu „18.450,00 lei", iar un model
 * care citeste asta poate intoarce sirul asa cum l-a vazut. Mai bine il
 * intelegem noi decat sa pierdem cifra sau, mai rau, sa citim 18.450,00 ca 18,45.
 *
 * Orice nu se poate citi ca numar devine `null` — adica „nu s-a gasit", ceea ce
 * regulile stiu sa trateze. Niciodata 0: zero e o afirmatie despre bani.
 */
export function numar(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;

  let s = v.trim();
  if (!s) return null;

  // Sumele negative apar si cu minus, si intre paranteze (uz contabil).
  const inParanteze = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  s = s.replace(/lei|ron|RON|\s| /g, "");
  const negativ = inParanteze || s.startsWith("-");
  s = s.replace(/^[-+]/, "");
  if (!/^[\d.,]+$/.test(s)) return null;

  const ultimaVirgula = s.lastIndexOf(",");
  const ultimulPunct = s.lastIndexOf(".");
  let intreg: string;
  let zecimale = "";

  if (ultimaVirgula === -1 && ultimulPunct === -1) {
    intreg = s;
  } else {
    // Separatorul zecimal e ultimul care apare, DACA e urmat de una-doua cifre.
    // „18.450" are trei cifre dupa punct, deci punctul separa miile.
    const poz = Math.max(ultimaVirgula, ultimulPunct);
    const dupa = s.length - poz - 1;
    if (dupa >= 1 && dupa <= 2) {
      intreg = s.slice(0, poz);
      zecimale = s.slice(poz + 1);
    } else {
      intreg = s;
    }
  }

  intreg = intreg.replace(/[.,]/g, "");
  if (!/^\d*$/.test(intreg) || !/^\d*$/.test(zecimale)) return null;
  if (intreg === "" && zecimale === "") return null;

  const rezultat = Number(`${intreg || "0"}.${zecimale || "0"}`);
  if (!Number.isFinite(rezultat)) return null;
  return negativ ? -rezultat : rezultat;
}

function sir(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  // Modelele scriu uneori „N/A" sau „nu se regaseste" in loc sa lase gol.
  if (!s || /^(n\/?a|null|nedefinit|necunoscut|nu (se |a |apare|reiese))/i.test(s)) return null;
  return s;
}

function boolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (/^(da|true|yes)$/i.test(v.trim())) return true;
    if (/^(nu|false|no)$/i.test(v.trim())) return false;
  }
  return null;
}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obiectDin = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function chitanta(v: unknown): { numar: string | null; suma: number | null } {
  const o = obiectDin(v);
  return { numar: sir(o.numar), suma: numar(o.suma) };
}

/**
 * Aduce raspunsul modelului la forma `ExtrasDosar`, camp cu camp.
 *
 * Tot ce nu se potriveste cade in `null` sau se scoate din liste. Nimic din ce
 * intoarce modelul nu ajunge in reguli fara sa treaca pe aici — altfel un sir
 * strecurat intr-un camp de suma ar face `soldFinal > PLAFON` sa fie o
 * comparatie intre un text si un numar, iar constatarea ar disparea in tacere.
 */
export function curataExtras(brut: unknown): ExtrasDosar {
  const r = obiectDin(brut);
  const ident = obiectDin(r.identificare);
  const per = obiectDin(r.perioada);
  const casa = obiectDin(r.casa);
  const banca = obiectDin(r.banca);
  const fonduri = obiectDin(r.fonduri);
  const listaPlata = obiectDin(r.lista);
  const restantieri = obiectDin(r.restantieri);
  const furnizori = obiectDin(r.furnizori);
  const penalizari = obiectDin(r.penalizari);
  const distributie = obiectDin(r.distributie);
  const salarii = obiectDin(r.salarii);

  return {
    distributie: { total: numar(distributie.total), perioada: sir(distributie.perioada) },
    identificare: {
      denumire: sir(ident.denumire), cui: sir(ident.cui), adresa: sir(ident.adresa),
      iban: sir(ident.iban), banca: sir(ident.banca), presedinte: sir(ident.presedinte),
      administrator: sir(ident.administrator), cenzor: sir(ident.cenzor),
    },
    perioada: {
      luna: sir(per.luna), an: numar(per.an),
      dataAfisarii: sir(per.dataAfisarii), dataScadenta: sir(per.dataScadenta),
    },
    casa: {
      soldInitial: numar(casa.soldInitial), soldFinal: numar(casa.soldFinal),
      totalIncasari: numar(casa.totalIncasari), totalPlati: numar(casa.totalPlati),
      primaChitanta: chitanta(casa.primaChitanta), ultimaChitanta: chitanta(casa.ultimaChitanta),
      soldMaximZilnic: numar(casa.soldMaximZilnic), zileCuIncasari: numar(casa.zileCuIncasari),
    },
    banca: {
      soldInitial: numar(banca.soldInitial), soldFinal: numar(banca.soldFinal),
      totalIncasari: numar(banca.totalIncasari), totalPlati: numar(banca.totalPlati),
      conturi: lista(banca.conturi).map(obiectDin).map(c => ({
        iban: sir(c.iban), descriere: sir(c.descriere) ?? "cont", sold: numar(c.sold),
      })),
    },
    fonduri: {
      rulment: numar(fonduri.rulment), reparatii: numar(fonduri.reparatii),
      penalitati: numar(fonduri.penalitati),
      altele: lista(fonduri.altele).map(obiectDin)
        .map(f => ({ denumire: sir(f.denumire) ?? "", sold: numar(f.sold) }))
        .filter(f => f.denumire),
    },
    lista: {
      totalCheltuieli: numar(listaPlata.totalCheltuieli),
      totalRestante: numar(listaPlata.totalRestante),
      numarApartamente: numar(listaPlata.numarApartamente),
      coloane: lista(listaPlata.coloane).map(sir).filter((c): c is string => Boolean(c)),
      areColoanaRestante: boolean(listaPlata.areColoanaRestante),
      areColoanaPenalizari: boolean(listaPlata.areColoanaPenalizari),
      areColoanaFondRulment: boolean(listaPlata.areColoanaFondRulment),
    },
    restantieri: {
      total: numar(restantieri.total),
      // Un restantier fara suma n-ajuta pe nimeni si ar strica numaratoarea, deci
      // intra in lista doar cei cu apartament SI suma citite.
      apartamente: lista(restantieri.apartamente).map(obiectDin)
        .map(a => ({ apartament: sir(a.apartament) ?? "", suma: numar(a.suma), luniIntarziere: numar(a.luniIntarziere) }))
        .filter((a): a is { apartament: string; suma: number; luniIntarziere: number | null } =>
          Boolean(a.apartament) && a.suma !== null),
    },
    furnizori: {
      facturi: lista(furnizori.facturi).map(obiectDin)
        .map(f => ({
          furnizor: sir(f.furnizor) ?? "", numar: sir(f.numar), data: sir(f.data),
          suma: numar(f.suma), achitata: boolean(f.achitata),
          modalitatePlata: ["banca", "numerar"].includes(String(f.modalitatePlata)) ? String(f.modalitatePlata) : null,
        }))
        .filter(f => f.furnizor || f.numar || f.suma !== null),
      totalNeachitat: numar(furnizori.totalNeachitat),
    },
    penalizari: {
      aplicate: boolean(penalizari.aplicate), cotaZilnica: numar(penalizari.cotaZilnica),
      total: numar(penalizari.total),
    },
    salarii: { exista: boolean(salarii.exista), total: numar(salarii.total) },
    documenteProblematice: lista(r.documenteProblematice).map(obiectDin)
      .map(d => ({ tip: sir(d.tip) ?? "necunoscut", problema: sir(d.problema) ?? "" }))
      .filter(d => d.problema),
    neconcordante: lista(r.neconcordante).map(obiectDin)
      .map(n => ({ despre: sir(n.despre) ?? "", detaliu: sir(n.detaliu) ?? "" }))
      .filter(n => n.despre || n.detaliu),
  };
}

/* ------------------------------------------------------------------------- */

export type RezultatExtragere = {
  extras: ExtrasDosar;
  tokensIn: number;
  tokensOut: number;
  /** Fisierele pe care nu le-am putut trimite deloc (format nepotrivit). */
  netrimise: { tip: string; numeFisier: string; motiv: string }[];
};

export async function citesteDosar(
  fisiere: FisierDeCitit[],
  context: { denumire: string; cui: string; luna: string; an: number },
  jurnal?: (mesaj: string) => void | Promise<void>,
  /**
   * Ce s-a citit deja, la o rulare anterioara.
   *
   * Cand e dat, `fisiere` contine DOAR documentele noi, iar ce iese de la ele se
   * imbina peste asta. Fara el, adaugarea unei facturi la un dosar de douazeci
   * ar fi insemnat sa se plateasca a doua oara citirea tuturor celor douazeci.
   */
  deja?: ExtrasDosar | null,
): Promise<RezultatExtragere> {
  const client = new Anthropic();

  const netrimise = fisiere
    .filter(f => !sePoateCiti(f.mimeType))
    .map(f => ({ tip: f.tip, numeFisier: f.numeFisier, motiv: `format ${f.mimeType} — nu poate fi citit` }));

  const problematice = netrimise.map(n => ({ tip: n.tip, problema: n.motiv }));
  const citibile = fisiere.filter(f => sePoateCiti(f.mimeType));
  if (citibile.length === 0) {
    return { extras: { ...(deja ?? EXTRAS_GOL), documenteProblematice: problematice }, tokensIn: 0, tokensOut: 0, netrimise };
  }

  // Documentele principale merg in prima transa: daca ceva se strica pe drum,
  // macar lista de plata si registrele au fost citite.
  const ordonate = [...citibile].sort((a, b) => prioritate(a.tip) - prioritate(b.tip));
  const transe: FisierDeCitit[][] = [];
  for (let i = 0; i < ordonate.length; i += MAX_FISIERE_PE_CERERE) {
    transe.push(ordonate.slice(i, i + MAX_FISIERE_PE_CERERE));
  }

  // Pornim de la ce se stia deja, cand exista: transele urmatoare se imbina peste.
  let extras: ExtrasDosar = { ...(deja ?? EXTRAS_GOL), documenteProblematice: problematice };
  let tokensIn = 0;
  let tokensOut = 0;

  for (let i = 0; i < transe.length; i++) {
    const transa = transe[i];
    await jurnal?.(
      transe.length > 1
        ? `Se citesc documentele ${i * MAX_FISIERE_PE_CERERE + 1}–${i * MAX_FISIERE_PE_CERERE + transa.length} din ${ordonate.length}`
        : `Se citesc ${transa.length} documente`,
    );

    // Modelului i se spune ce s-a gasit pana acum — si din transele de dinainte,
    // si din rularile de dinainte — ca sa nu repete si sa se uite doar la ce e nou.
    const rezultat = await citesteTransa(client, transa, context, i > 0 || deja ? extras : null);
    tokensIn += rezultat.tokensIn;
    tokensOut += rezultat.tokensOut;
    extras = imbina(extras, rezultat.extras);
  }

  return { extras, tokensIn, tokensOut, netrimise };
}

function prioritate(tip: string): number {
  const ordine = ["lista_plata", "explicatii_lista", "distributia_facturilor", "registru_casa", "extras_cont", "registru_banca", "registru_fond", "situatie_activ_pasiv"];
  const i = ordine.indexOf(tipDeBaza(tip));
  return i === -1 ? ordine.length : i;
}

async function citesteTransa(
  client: Anthropic,
  fisiere: FisierDeCitit[],
  context: { denumire: string; cui: string; luna: string; an: number },
  deja: ExtrasDosar | null,
): Promise<{ extras: ExtrasDosar; tokensIn: number; tokensOut: number }> {
  const continut: Anthropic.ContentBlockParam[] = [];

  for (const f of fisiere) {
    continut.push({ type: "text", text: `\n=== ${eticheta(f.tip)} — fișierul „${f.numeFisier}" (tip: ${f.tip}) ===` });

    if (esteOffice(f.mimeType)) {
      // Foaia de calcul nu se poate ARATA modelului, dar se poate CITI. Celulele
      // vin ca „A2=1 | B2=2026-06-01 | C2=Încasare cotă | D2=412.50", cu datele
      // deja traduse din numerele Excel — altfel „46204" ar fi putut trece drept
      // sumă, iar cifra greșită ar fi ajuns într-un raport semnat.
      const office = await citesteOffice(f.continut, f.mimeType, LIMITA_VERIFICARE);
      continut.push({
        type: "text",
        text: office
          ? `Conținutul fișierului, extras din el (nu e o imagine — e textul și celulele lui):\n${office.text}`
          : "Fișierul nu a putut fi deschis. Tratează documentul acesta ca lipsă.",
      });
      continue;
    }

    const data = f.continut.toString("base64");
    if (f.mimeType === "application/pdf") {
      continut.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else {
      continut.push({
        type: "image",
        source: { type: "base64", media_type: f.mimeType as "image/png" | "image/jpeg" | "image/webp", data },
      });
    }
  }

  continut.push({
    type: "text",
    text: [
      `Asociația, conform contului din platformă: ${context.denumire || "nedeclarată"}${context.cui ? `, CUI ${context.cui}` : ""}.`,
      `Perioada verificată: ${context.luna} ${context.an}.`,
      "Datele de mai sus sunt doar context. Dacă documentele spun altceva, întoarce ce scrie în documente — diferența se semnalează separat.",
      deja
        ? `\nAi citit deja o parte din dosar. Nu repeta ce s-a găsit; completează doar ce apare în documentele de față și lasă null restul. Ce s-a găsit până acum:\n${rezumatScurt(deja)}`
        : "",
    ].filter(Boolean).join("\n"),
  });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: INSTRUCTIUNI,
    tools: [{
      name: "raporteaza_date",
      description: "Întoarce cifrele citite din documentele atașate. Se apelează exact o dată.",
      // Fara `strict`: vezi explicatia din capul fisierului. Forma se verifica
      // in `curataExtras`, dupa raspuns.
      input_schema: SCHEMA_EXTRAS as unknown as Anthropic.Tool.InputSchema,
    }],
    tool_choice: { type: "tool", name: "raporteaza_date" },
    messages: [{ role: "user", content: continut }],
  });

  const raspuns = await stream.finalMessage();
  const apel = raspuns.content.find(b => b.type === "tool_use");
  if (!apel || apel.type !== "tool_use") {
    throw new Error("Modelul nu a întors datele în forma cerută.");
  }

  return {
    extras: curataExtras(apel.input),
    tokensIn: raspuns.usage.input_tokens,
    tokensOut: raspuns.usage.output_tokens,
  };
}

function rezumatScurt(e: ExtrasDosar): string {
  const linii: string[] = [];
  if (e.identificare.denumire) linii.push(`- denumire: ${e.identificare.denumire}`);
  if (e.identificare.cui) linii.push(`- CUI: ${e.identificare.cui}`);
  if (e.casa.soldFinal !== null) linii.push(`- sold casă final: ${e.casa.soldFinal}`);
  if (e.banca.soldFinal !== null) linii.push(`- sold bancă final: ${e.banca.soldFinal}`);
  if (e.lista.totalCheltuieli !== null) linii.push(`- total listă: ${e.lista.totalCheltuieli}`);
  if (e.furnizori.facturi.length) linii.push(`- facturi citite: ${e.furnizori.facturi.length}`);
  return linii.length ? linii.join("\n") : "- nimic încă";
}

/**
 * Imbina doua citiri partiale.
 *
 * Prima valoare gasita castiga: transele sunt ordonate cu documentele primare
 * la inceput, deci ce vine din registru bate ce vine dintr-o recapitulatie
 * citita mai tarziu. Listele se aduna, fara duplicate evidente.
 */
function imbina(a: ExtrasDosar, b: ExtrasDosar): ExtrasDosar {
  const primul = <T>(x: T | null, y: T | null): T | null => (x !== null && x !== undefined ? x : y ?? null);

  return {
    distributie: {
      total: primul(a.distributie?.total ?? null, b.distributie?.total ?? null),
      perioada: primul(a.distributie?.perioada ?? null, b.distributie?.perioada ?? null),
    },
    identificare: {
      denumire: primul(a.identificare.denumire, b.identificare.denumire),
      cui: primul(a.identificare.cui, b.identificare.cui),
      adresa: primul(a.identificare.adresa, b.identificare.adresa),
      iban: primul(a.identificare.iban, b.identificare.iban),
      banca: primul(a.identificare.banca, b.identificare.banca),
      presedinte: primul(a.identificare.presedinte, b.identificare.presedinte),
      administrator: primul(a.identificare.administrator, b.identificare.administrator),
      cenzor: primul(a.identificare.cenzor, b.identificare.cenzor),
    },
    perioada: {
      luna: primul(a.perioada.luna, b.perioada.luna),
      an: primul(a.perioada.an, b.perioada.an),
      dataAfisarii: primul(a.perioada.dataAfisarii, b.perioada.dataAfisarii),
      dataScadenta: primul(a.perioada.dataScadenta, b.perioada.dataScadenta),
    },
    casa: {
      soldInitial: primul(a.casa.soldInitial, b.casa.soldInitial),
      soldFinal: primul(a.casa.soldFinal, b.casa.soldFinal),
      totalIncasari: primul(a.casa.totalIncasari, b.casa.totalIncasari),
      totalPlati: primul(a.casa.totalPlati, b.casa.totalPlati),
      primaChitanta: a.casa.primaChitanta.numar ? a.casa.primaChitanta : b.casa.primaChitanta,
      ultimaChitanta: a.casa.ultimaChitanta.numar ? a.casa.ultimaChitanta : b.casa.ultimaChitanta,
      soldMaximZilnic: primul(a.casa.soldMaximZilnic, b.casa.soldMaximZilnic),
      zileCuIncasari: primul(a.casa.zileCuIncasari, b.casa.zileCuIncasari),
    },
    banca: {
      soldInitial: primul(a.banca.soldInitial, b.banca.soldInitial),
      soldFinal: primul(a.banca.soldFinal, b.banca.soldFinal),
      totalIncasari: primul(a.banca.totalIncasari, b.banca.totalIncasari),
      totalPlati: primul(a.banca.totalPlati, b.banca.totalPlati),
      conturi: [...a.banca.conturi, ...b.banca.conturi.filter(c => !a.banca.conturi.some(x => x.iban && x.iban === c.iban))],
    },
    fonduri: {
      rulment: primul(a.fonduri.rulment, b.fonduri.rulment),
      reparatii: primul(a.fonduri.reparatii, b.fonduri.reparatii),
      penalitati: primul(a.fonduri.penalitati, b.fonduri.penalitati),
      altele: [...a.fonduri.altele, ...b.fonduri.altele.filter(f => !a.fonduri.altele.some(x => x.denumire === f.denumire))],
    },
    lista: {
      totalCheltuieli: primul(a.lista.totalCheltuieli, b.lista.totalCheltuieli),
      totalRestante: primul(a.lista.totalRestante, b.lista.totalRestante),
      numarApartamente: primul(a.lista.numarApartamente, b.lista.numarApartamente),
      coloane: a.lista.coloane.length ? a.lista.coloane : b.lista.coloane,
      areColoanaRestante: primul(a.lista.areColoanaRestante, b.lista.areColoanaRestante),
      areColoanaPenalizari: primul(a.lista.areColoanaPenalizari, b.lista.areColoanaPenalizari),
      areColoanaFondRulment: primul(a.lista.areColoanaFondRulment, b.lista.areColoanaFondRulment),
    },
    restantieri: {
      total: primul(a.restantieri.total, b.restantieri.total),
      apartamente: [
        ...a.restantieri.apartamente,
        ...b.restantieri.apartamente.filter(x => !a.restantieri.apartamente.some(y => y.apartament === x.apartament)),
      ],
    },
    furnizori: {
      facturi: [
        ...a.furnizori.facturi,
        ...b.furnizori.facturi.filter(x => !a.furnizori.facturi.some(y => y.furnizor === x.furnizor && y.numar === x.numar)),
      ],
      totalNeachitat: primul(a.furnizori.totalNeachitat, b.furnizori.totalNeachitat),
    },
    penalizari: {
      aplicate: primul(a.penalizari.aplicate, b.penalizari.aplicate),
      cotaZilnica: primul(a.penalizari.cotaZilnica, b.penalizari.cotaZilnica),
      total: primul(a.penalizari.total, b.penalizari.total),
    },
    salarii: {
      exista: primul(a.salarii.exista, b.salarii.exista),
      total: primul(a.salarii.total, b.salarii.total),
    },
    documenteProblematice: [
      ...a.documenteProblematice,
      ...b.documenteProblematice.filter(x => !a.documenteProblematice.some(y => y.tip === x.tip && y.problema === x.problema)),
    ],
    neconcordante: [
      ...a.neconcordante,
      ...b.neconcordante.filter(x => !a.neconcordante.some(y => y.despre === x.despre)),
    ],
  };
}
