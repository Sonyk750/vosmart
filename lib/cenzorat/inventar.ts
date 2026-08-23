import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { TIPURI, ghicesteTip } from "./documente";

/**
 * Inventarul dosarului: ce este FIECARE document, citit din el.
 *
 * Pana acum tipul se ghicea din numele fisierului, iar omul corecta ce nu se
 * nimerea. Nu tine: programele de administrare scot facturile cu nume ca
 * „F_2026_06_1183.pdf" sau „Bloc Manager export 12.pdf" — nume care nu spun nici
 * ce e documentul, nici de la cine vine. Cenzorul avea de ales din lista, unul
 * cate unul, exact munca pe care aplicatia trebuia sa o faca in locul lui.
 *
 * Aici documentul se deschide si se citeste antetul. La o factura iese
 * „Factură Apa Nova" sau „Factură PPC" — numele furnizorului, nu al fisierului.
 *
 * MODELUL. Haiku 4.5, nu Opus. „Ce fel de document e asta si al cui e antetul"
 * e recunoastere, nu rationament, si costa de sase ori mai putin: masurat,
 * $0,04 pe dosar de 15 documente fata de $0,25. Proiectul foloseste deja Haiku
 * la fel, ca poarta ieftina in asistent.
 *
 * CAT TRIMITEM. O scanare merge la 1600 px, nu la 2400 px cat pastram: antetul
 * se citeste la fel, iar tokenii se injumatatesc (2 454 fata de 4 969). Dintr-un
 * PDF pleaca DOAR prima pagina — un registru de 20 de pagini trimis intreg ar
 * costa de douazeci de ori mai mult ca sa afli acelasi lucru din antet.
 */

const MODEL = process.env.VOSMART_MODEL_INVENTAR || "claude-haiku-4-5";

/** Pretul Haiku 4.5, dolari pe milion de tokeni (iunie 2026). */
const PRET_IN = 1;
const PRET_OUT = 5;

/** Latura lunga la care coboara imaginea trimisa la citire. */
const LATURA_CITIRE = 1600;

/** Peste atat nu asteptam un document; ramane ce s-a ghicit din nume. */
const RABDARE_MS = 40_000;

// Tuplu, nu tablou: `z.enum` cere cel putin un element la nivel de tip.
const CHEI: [string, ...string[]] = ["altele", ...TIPURI.map(t => t.cheie)];

const Citire = z.object({
  tip: z.enum(CHEI).describe("Tipul documentului, din lista dată."),
  denumire: z.string().describe(
    "Cum se numește documentul, în cuvintele lui, maximum 60 de caractere. " +
    "La facturi TREBUIE să conțină furnizorul: „Factură Apa Nova”, „Factură PPC”, „Factură Decoimob”.",
  ),
  emitent: z.string().describe("Cine a emis documentul; gol dacă nu scrie nicăieri."),
  perioada: z.string().describe("Perioada la care se referă, ex. „iunie 2026”; gol dacă nu scrie."),
  siguranta: z.enum(["sigur", "probabil", "nesigur"]),
});

export type Citit = z.infer<typeof Citire> & { tipSursa: "ai" | "nume" };

export type RezultatInventar = {
  citiri: (Citit | null)[];
  tokensIn: number;
  tokensOut: number;
  cost: number;
};

const LISTA_TIPURI = TIPURI.map(t => `- ${t.cheie}: ${t.eticheta} — ${t.explicatie}`).join("\n");

const INSTRUCTIUNE = `Ești inventarul unui dosar de cenzorat pentru o asociație de proprietari din România.

Ți se dă UN document. Uită-te ÎN el — antet, titlu, siglă, emitent, perioadă. Numele fișierului
nu contează și poate fi complet înșelător: programele de administrare exportă facturile cu nume
ca „F_2026_06_1183.pdf".

Tipuri posibile:
${LISTA_TIPURI}
- altele: nu se potrivește cu niciunul de mai sus.

Reguli pentru „denumire":
- scurtă, cum ar spune-o un om: „Listă de plată iunie 2026", „Registru de casă", „Situația soldurilor";
- la FACTURI pune numele furnizorului, așa cum apare pe factură: „Factură Apa Nova",
  „Factură PPC", „Factură Distrigaz", „Factură Decoimob". Furnizorul e lucrul care contează
  într-un dosar de cenzorat, nu cuvântul „factură";
- fără numele fișierului, fără extensii, fără numere de ordine interne.

Dacă documentul e ilizibil sau nu-ți dai seama ce e, pune tip „altele" și siguranță „nesigur".
Nu inventa un emitent pe care nu-l vezi scris.`;

/** Ce se poate trimite la citire, si sub ce forma. */
async function pregatesteBucata(
  continut: Buffer,
  mimeType: string,
): Promise<Anthropic.ContentBlockParam | null> {
  if (mimeType.startsWith("image/")) {
    const { default: sharp } = await import("sharp");
    const mic = await sharp(continut, { failOn: "none" })
      .rotate()
      .resize({ width: LATURA_CITIRE, height: LATURA_CITIRE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 78 })
      .toBuffer();
    return {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: mic.toString("base64") },
    };
  }

  if (mimeType === "application/pdf") {
    // Doar prima pagina. Antetul e acolo, iar restul paginilor ar fi tokeni
    // platiti degeaba. Daca decuparea da gres, trimitem PDF-ul asa cum e:
    // mai scump, dar mai bine decat sa nu citim documentul deloc.
    try {
      const { PDFDocument } = await import("pdf-lib");
      const intreg = await PDFDocument.load(continut, { ignoreEncryption: true });
      if (intreg.getPageCount() > 1) {
        const doar = await PDFDocument.create();
        const [prima] = await doar.copyPages(intreg, [0]);
        doar.addPage(prima);
        continut = Buffer.from(await doar.save());
      }
    } catch (e) {
      console.warn("[inventar] nu am putut decupa prima pagină:", e);
    }
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: continut.toString("base64") },
    };
  }

  // Word, Excel, arhive: modelul nu le poate deschide asa cum sunt.
  return null;
}

async function citesteUnul(
  client: Anthropic,
  continut: Buffer,
  numeFisier: string,
  mimeType: string,
): Promise<{ citit: Citit | null; tokensIn: number; tokensOut: number }> {
  const bucata = await pregatesteBucata(continut, mimeType);
  if (!bucata) return { citit: null, tokensIn: 0, tokensOut: 0 };

  const raspuns = await client.messages.parse({
      model: MODEL,
      max_tokens: 400,
      system: INSTRUCTIUNE,
      messages: [{
        role: "user",
        content: [
          bucata,
          // Numele fisierului merge totusi, la coada si marcat ca neserios: cand
          // documentul e o scanare stramba, e singurul indiciu ramas. Instructiunea
          // spune limpede sa nu se ia dupa el.
          { type: "text", text: `Ce document este acesta? (numele fișierului, doar ca ultim indiciu: „${numeFisier}")` },
        ],
      }],
      output_config: { format: zodOutputFormat(Citire) },
  });

  const date = raspuns.parsed_output;
  return {
    citit: date ? { ...date, tipSursa: "ai" } : null,
    tokensIn: raspuns.usage.input_tokens,
    tokensOut: raspuns.usage.output_tokens,
  };
}

/**
 * Citeste documentele unui teanc.
 *
 * Nu arunca niciodata: un document pe care modelul nu l-a putut citi se intoarce
 * ca `null`, iar apelantul cade inapoi pe ce s-a ghicit din nume. Inventarul e o
 * imbunatatire, nu o conditie ca dosarul sa intre.
 */
export async function inventariaza(
  fisiere: { continut: Buffer; numeFisier: string; mimeType: string }[],
): Promise<RezultatInventar> {
  if (fisiere.length === 0) return { citiri: [], tokensIn: 0, tokensOut: 0, cost: 0 };

  // Rabdarea sta pe client: `messages.parse` nu primeste optiuni de cerere.
  const client = new Anthropic({ timeout: RABDARE_MS, maxRetries: 1 });
  const citiri: (Citit | null)[] = new Array(fisiere.length).fill(null);
  let tokensIn = 0;
  let tokensOut = 0;

  // Cate patru odata: destul cat sa nu se astepte unul dupa altul, putin cat sa
  // nu ne lovim de limita de cereri cand cineva incarca patruzeci de facturi.
  const DEODATA = 4;
  for (let i = 0; i < fisiere.length; i += DEODATA) {
    const transa = fisiere.slice(i, i + DEODATA);
    const rezultate = await Promise.all(
      transa.map(async (f, j) => {
        try {
          return { j: i + j, ...(await citesteUnul(client, f.continut, f.numeFisier, f.mimeType)) };
        } catch (e) {
          console.warn(`[inventar] „${f.numeFisier}" nu a putut fi citit:`, e);
          return { j: i + j, citit: null, tokensIn: 0, tokensOut: 0 };
        }
      }),
    );
    for (const r of rezultate) {
      citiri[r.j] = r.citit;
      tokensIn += r.tokensIn;
      tokensOut += r.tokensOut;
    }
  }

  return {
    citiri,
    tokensIn,
    tokensOut,
    cost: (tokensIn / 1e6) * PRET_IN + (tokensOut / 1e6) * PRET_OUT,
  };
}

/** Ce ramane cand modelul n-a putut citi documentul: ghicitul din nume. */
export function dinNume(numeFisier: string): Citit {
  const ghicit = ghicesteTip(numeFisier);
  return {
    tip: ghicit.cheie,
    // Fara extensie si fara sublinieri — tot numele fisierului e, dar macar citibil.
    denumire: numeFisier.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 60),
    emitent: "",
    perioada: "",
    siguranta: ghicit.incredere === "sigur" ? "probabil" : "nesigur",
    tipSursa: "nume",
  };
}
