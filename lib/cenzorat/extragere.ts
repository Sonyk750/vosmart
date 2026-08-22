import Anthropic from "@anthropic-ai/sdk";
import { EXTRAS_GOL, ExtrasDosar } from "./tipuri";
import { eticheta, tipDeBaza } from "./documente";

/**
 * Citirea documentelor din dosar.
 *
 * Aici se schimba cel mai mult fata de varianta veche. Inainte ceream modelului
 * sa scrie direct raportul, in proza, dupa un sablon de doua pagini — si pe urma
 * scoteam cifrele din text cu expresii regulate. Orice abatere de la sablon
 * insemna scor gresit sau constatari pierdute.
 *
 * Acum modelul are o singura sarcina: sa CITEASCA si sa intoarca cifre, intr-o
 * forma fixa. Forma e impusa de API prin `strict: true` pe schema uneltei, deci
 * raspunsul nu poate veni „aproape bine". Ce se face cu cifrele — constatari,
 * scor, raport — se intampla in cod, in `reguli.ts`, unde se poate citi si
 * verifica.
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

/** Doar formatele pe care modelul le poate chiar vedea. */
const MIME_CITIBILE = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export type FisierDeCitit = {
  tip: string;
  numeFisier: string;
  mimeType: string;
  continut: Buffer;
};

/**
 * „Poate lipsi" se scrie cu `anyOf`, nu cu `type: ["number", "null"]`.
 *
 * Subsetul de JSON Schema acceptat de modul strict enumera `anyOf` explicit;
 * tablourile de tipuri nu apar in el. Diferenta conteaza: daca schema e
 * respinsa, cererea cade cu 400, iar dosarul se opreste la citire.
 */
const optional = (tip: string, descriere?: string) => ({
  anyOf: [{ type: tip }, { type: "null" }],
  ...(descriere ? { description: descriere } : {}),
});

const nr = optional("number");
const txt = optional("string");
const bool = optional("boolean");

/** Schema stricta: fiecare camp e obligatoriu, dar are voie sa fie `null`. */
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
          anyOf: [{ type: "string", enum: ["banca", "numerar"] }, { type: "null" }],
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
    items: obiect({
      tip: { type: "string", description: "Cheia tipului de document, așa cum a fost primită." },
      problema: { type: "string", description: "Pe scurt, de ce nu s-a putut citi." },
    }),
  },
});

const INSTRUCTIUNI = `Ești asistentul de verificare al unei firme de cenzorat pentru asociații de proprietari din România.

Sarcina ta este să CITEȘTI documentele atașate și să întorci cifrele din ele. Nu întocmi un raport, nu formula concluzii, nu da recomandări — altcineva face asta din datele pe care le întorci tu.

Reguli, în ordinea importanței:

1. Ce nu scrie în documente rămâne null. Nu deduce, nu calcula ce n-ai văzut, nu completa cu o valoare plauzibilă. Un câmp null este un răspuns corect și util; o cifră inventată ajunge într-un raport semnat de cenzor și îl compromite.
2. Sumele se întorc ca numere, în lei, cu punct zecimal (1234.56), fără separator de mii și fără simbol de monedă. Sumele scrise între paranteze sau cu semnul minus sunt negative.
3. Dacă același indicator apare în două documente cu valori diferite, întoarce valoarea din documentul primar (registrul, nu recapitulația) și adaugă documentul secundar în documenteProblematice, cu explicația diferenței.
4. Dacă un document este ilizibil, incomplet sau nu conține ce promite numele lui, adaugă-l în documenteProblematice cu tipul primit și un motiv scurt. Nu ghici conținutul lui.
5. La restanțieri, întoarce apartamentele individual, cu numărul așa cum apare pe listă. Dacă lista are zeci de apartamente restante, întoarce-le pe toate.
6. modalitatePlata se completează doar când reiese explicit din document (mențiune de virament, ordin de plată, chitanță de casă). Altfel null.
7. Diferențele sub 0,50 lei sunt rotunjiri și nu se semnalează.`;

/**
 * Cate pagini de document trimitem intr-o cerere. Un dosar cu 40 de facturi
 * scanate depaseste si limita de marime a cererii, si rabdarea oricui asteapta
 * raspunsul, asa ca il taiem in transe si imbinam rezultatele.
 */
const MAX_FISIERE_PE_CERERE = 12;

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
): Promise<RezultatExtragere> {
  const client = new Anthropic();

  const netrimise = fisiere
    .filter(f => !MIME_CITIBILE.includes(f.mimeType))
    .map(f => ({ tip: f.tip, numeFisier: f.numeFisier, motiv: `format ${f.mimeType} — nu poate fi citit` }));

  const citibile = fisiere.filter(f => MIME_CITIBILE.includes(f.mimeType));
  if (citibile.length === 0) {
    return { extras: { ...EXTRAS_GOL, documenteProblematice: netrimise.map(n => ({ tip: n.tip, problema: n.motiv })) }, tokensIn: 0, tokensOut: 0, netrimise };
  }

  // Documentele principale merg in prima transa: daca ceva se strica pe drum,
  // macar lista de plata si registrele au fost citite.
  const ordonate = [...citibile].sort((a, b) => prioritate(a.tip) - prioritate(b.tip));
  const transe: FisierDeCitit[][] = [];
  for (let i = 0; i < ordonate.length; i += MAX_FISIERE_PE_CERERE) {
    transe.push(ordonate.slice(i, i + MAX_FISIERE_PE_CERERE));
  }

  let extras: ExtrasDosar = { ...EXTRAS_GOL, documenteProblematice: netrimise.map(n => ({ tip: n.tip, problema: n.motiv })) };
  let tokensIn = 0;
  let tokensOut = 0;

  for (let i = 0; i < transe.length; i++) {
    const transa = transe[i];
    await jurnal?.(
      transe.length > 1
        ? `Se citesc documentele ${i * MAX_FISIERE_PE_CERERE + 1}–${i * MAX_FISIERE_PE_CERERE + transa.length} din ${ordonate.length}`
        : `Se citesc ${transa.length} documente`,
    );

    const rezultat = await citesteTransa(client, transa, context, i > 0 ? extras : null);
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
      strict: true,
      input_schema: SCHEMA_EXTRAS as Anthropic.Tool.InputSchema,
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
    // `strict: true` garanteaza forma, dar parcurgem tot printr-un obiect gol ca
    // sa nu depindem de prezenta fiecarui camp daca schema se schimba candva.
    extras: { ...EXTRAS_GOL, ...(apel.input as Partial<ExtrasDosar>) },
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
  };
}
