/**
 * Citirea fisierelor Word si Excel.
 *
 * Un .docx sau .xlsx nu e un format binar: e o arhiva ZIP cu XML inauntru. Le
 * desfacem cu JSZip, care era deja in casa pentru arhivele incarcate — fara
 * nicio biblioteca noua si fara niciun serviciu din afara.
 *
 * DE CE CONTEAZA. Modelul nu poate PRIVI un .xlsx asa cum priveste o pagina de
 * PDF. Pana acum asta insemna ca registrele trimise in Excel treceau prin dosar
 * neatinse: apareau la „format care nu poate fi citit", iar cifrele din ele nu
 * intrau in verificare deloc. La o asociatie care isi tine registrul de casa in
 * Excel, raportul se dadea fara registrul de casa.
 *
 * Textul scos aici e bun pentru amandoua treburile: inventarul are nevoie doar de
 * antet (`LIMITA_INVENTAR`), verificarea are nevoie de cifre (`LIMITA_VERIFICARE`).
 *
 * `.doc` si `.xls` VECHI nu intra: alea chiar sunt binare (OLE), si nu se desfac
 * cu un zip. Pentru ele ramane ce se poate afla din numele fisierului, iar
 * ecranul o spune deschis in loc sa se prefaca.
 */

const WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function esteOffice(mimeType: string): boolean {
  return mimeType === WORD || mimeType === EXCEL;
}

/** Cat text ii trebuie inventarului: antetul si titlul, nu continutul. */
export const LIMITA_INVENTAR = 6_000;

/** Cat ii trebuie verificarii: cifrele. ~15 mii de tokeni, marginit dinadins. */
export const LIMITA_VERIFICARE = 60_000;

const ENTITATI: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'",
};

function fara(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, m => ENTITATI[m] ?? " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ EXCEL */

/** Formatele de numar predefinite care inseamna data. Vezi ECMA-376, §18.8.30. */
const FORMATE_DATA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * Ce coloane sunt date calendaristice.
 *
 * Intr-un .xlsx o data nu e un text, e un NUMAR — 46204 inseamna 1 iunie 2026.
 * Fara traducere, coloana „Data" dintr-un registru de casa ar ajunge la model ca
 * un sir de numere de cinci cifre, iar el ar putea sa le ia drept sume. De aceea
 * ne uitam in `styles.xml` care stiluri poarta un format de data.
 */
function stiluriDeData(styles: string): Set<number> {
  const dataDupaId = new Map<number, boolean>();
  for (const m of styles.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    const cod = m[2].replace(/\[[^\]]*\]/g, "").replace(/"[^"]*"/g, "");
    dataDupaId.set(Number(m[1]), /[dmyDMY]/.test(cod) && !/^[^dmy]*0[^dmy]*$/.test(cod));
  }

  const rezultat = new Set<number>();
  const zona = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? "";
  let i = 0;
  for (const m of zona.matchAll(/<xf\b[^>]*>/g)) {
    const id = Number(/numFmtId="(\d+)"/.exec(m[0])?.[1] ?? "0");
    if (FORMATE_DATA.has(id) || dataDupaId.get(id)) rezultat.add(i);
    i++;
  }
  return rezultat;
}

/** Numarul de zile al Excel-ului → data. Ziua 1 e 1 ianuarie 1900. */
function dataDinSerie(serie: number): string {
  // 30 decembrie 1899, nu 31: Excel crede ca 1900 a fost an bisect, iar
  // decalajul se anuleaza pornind cu o zi mai devreme.
  const ms = Date.UTC(1899, 11, 30) + Math.round(serie) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

const NUME_COLOANA = (referinta: string) => referinta.replace(/\d+/g, "");

async function textDinExcel(
  arhiva: import("jszip"),
  limita: number,
): Promise<string> {
  const siruri: string[] = [];
  const parteSiruri = arhiva.file("xl/sharedStrings.xml");
  if (parteSiruri) {
    const xml = await parteSiruri.async("string");
    for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      // Un `<si>` poate avea mai multe `<t>`, cand textul are bucati formatate
      // diferit; ele formeaza o singura valoare de celula.
      siruri.push([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => fara(t[1])).join(""));
    }
  }

  const parteStiluri = arhiva.file("xl/styles.xml");
  const dataStil = parteStiluri ? stiluriDeData(await parteStiluri.async("string")) : new Set<number>();

  const numeFoi = arhiva.file("xl/workbook.xml")
    ? [...(await arhiva.file("xl/workbook.xml")!.async("string")).matchAll(/<sheet[^>]*name="([^"]+)"/g)].map(m => m[1])
    : [];

  const caiFoi = Object.keys(arhiva.files)
    .filter(c => /^xl\/worksheets\/sheet\d+\.xml$/.test(c))
    .sort((a, b) => Number(/(\d+)/.exec(a)![1]) - Number(/(\d+)/.exec(b)![1]));

  const bucati: string[] = [];
  let scris = 0;

  for (let f = 0; f < caiFoi.length && scris < limita; f++) {
    const xml = await arhiva.file(caiFoi[f])!.async("string");
    const randuri: string[] = [];

    for (const rand of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const celule: string[] = [];
      for (const c of rand[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const atribute = c[1];
        const tip = /t="([^"]+)"/.exec(atribute)?.[1];
        const stil = Number(/s="(\d+)"/.exec(atribute)?.[1] ?? "-1");
        const referinta = /r="([A-Z]+\d+)"/.exec(atribute)?.[1] ?? "";

        let valoare = "";
        if (tip === "inlineStr") {
          valoare = [...c[2].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => fara(t[1])).join("");
        } else {
          const brut = /<v>([\s\S]*?)<\/v>/.exec(c[2])?.[1];
          if (brut === undefined) continue;
          if (tip === "s") valoare = siruri[Number(brut)] ?? "";
          else if (tip === "b") valoare = brut === "1" ? "DA" : "NU";
          else if (dataStil.has(stil) && brut !== "" && !Number.isNaN(Number(brut))) valoare = dataDinSerie(Number(brut));
          else valoare = fara(brut);
        }

        if (valoare !== "") celule.push(`${NUME_COLOANA(referinta)}=${valoare}`);
      }
      // Randurile goale sunt majoritatea intr-o foaie de calcul si n-au ce spune.
      if (celule.length > 0) randuri.push(celule.join(" | "));
    }

    if (randuri.length === 0) continue;
    const cap = `--- Foaia „${numeFoi[f] ?? `${f + 1}`}" (${randuri.length} rânduri cu date) ---`;
    const text = [cap, ...randuri].join("\n");
    bucati.push(text.slice(0, Math.max(0, limita - scris)));
    scris += text.length;
  }

  return bucati.join("\n\n");
}

/* ------------------------------------------------------------------- WORD */

async function textDinWord(arhiva: import("jszip"), limita: number): Promise<string> {
  const parte = arhiva.file("word/document.xml");
  if (!parte) return "";

  const xml = (await parte.async("string"))
    // Structura de tabel se pastreaza: altfel un tabel de doua coloane iese ca un
    // sir de cuvinte lipite, si nu se mai vede ce valoare tine de ce rand.
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n");

  return fara(xml).replace(/\n{3,}/g, "\n\n").slice(0, limita);
}

/* ------------------------------------------------------------------ USA */

export type CititDinOffice = {
  /** Titlul din proprietatile documentului, cand exista. */
  titlu: string;
  /** Continutul, sub forma citibila. */
  text: string;
};

export async function citesteOffice(
  continut: Buffer,
  mimeType: string,
  limita: number,
): Promise<CititDinOffice | null> {
  if (!esteOffice(mimeType)) return null;

  try {
    const { default: JSZip } = await import("jszip");
    const arhiva = await JSZip.loadAsync(continut);

    const antet: string[] = [];
    let titlu = "";

    const proprietati = arhiva.file("docProps/core.xml");
    if (proprietati) {
      const xml = await proprietati.async("string");
      titlu = /<dc:title>([^<]*)<\/dc:title>/.exec(xml)?.[1]?.trim() ?? "";
      const subiect = /<dc:subject>([^<]*)<\/dc:subject>/.exec(xml)?.[1]?.trim();
      const autor = /<dc:creator>([^<]*)<\/dc:creator>/.exec(xml)?.[1]?.trim();
      if (titlu) antet.push(`Titlul documentului: ${titlu}`);
      if (subiect) antet.push(`Subiect: ${subiect}`);
      if (autor) antet.push(`Întocmit cu / de: ${autor}`);
    }

    const corp = mimeType === EXCEL
      ? await textDinExcel(arhiva, limita)
      : await textDinWord(arhiva, limita);

    const text = [...antet, corp].filter(Boolean).join("\n");
    return text.trim().length > 20 ? { titlu, text } : null;
  } catch (e) {
    console.warn("[office] fișierul nu a putut fi deschis:", e);
    return null;
  }
}
