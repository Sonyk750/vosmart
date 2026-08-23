/**
 * Ce fisiere primim intr-un dosar.
 *
 * Lista sta intr-un singur loc fiindca e nevoie de ea in trei: casuta de alegere
 * din browser (`accept`), verificarea de la incarcare si mesajul care explica
 * omului de ce a fost refuzat ceva.
 *
 * Doua feluri de restrictie, si nu se amesteca:
 *  - CE ACCEPTAM la incarcare — lista de mai jos, larga, fiindca asociatiile
 *    trimit ce au: scanari, tabele, arhive;
 *  - CE POATE FI DESCHIS IN PAGINA — doar PDF si imagini, si numai cu `sandbox`
 *    in CSP. Vezi ruta de descarcare. Un .doc sau .zip iese numai ca fisier
 *    salvat, niciodata randat.
 */

export type Format = {
  extensii: string[];
  /** Antetele MIME pe care le trimit browserele pentru formatul asta. */
  mime: string[];
  eticheta: string;
  /** Intra in VERIFICAREA automata, adica modelul ii poate ajunge la cifre? */
  citibilDeAi: boolean;
  /**
   * Poate fi INVENTARIAT, adica se poate afla din el ce document e?
   *
   * Nu e acelasi lucru cu cel de sus. Un .xlsx nu se poate arata modelului ca
   * pagina, dar e o arhiva cu XML inauntru, din care se scot titlul si textul —
   * destul cat sa stim ca e „Registru de casă - iunie 2026". Vezi
   * `lib/cenzorat/inventar.ts`. `.doc` si `.xls` vechi sunt binare, deci nu;
   * arhivele, nici atat.
   */
  inventariabil: boolean;
};

export const FORMATE: Format[] = [
  { extensii: [".pdf"], mime: ["application/pdf"], eticheta: "PDF", citibilDeAi: true, inventariabil: true },
  { extensii: [".jpg", ".jpeg"], mime: ["image/jpeg"], eticheta: "JPEG", citibilDeAi: true, inventariabil: true },
  { extensii: [".png"], mime: ["image/png"], eticheta: "PNG", citibilDeAi: true, inventariabil: true },
  { extensii: [".webp"], mime: ["image/webp"], eticheta: "WEBP", citibilDeAi: true, inventariabil: true },
  // Word si Excel MODERNE sunt arhive cu XML inauntru: din ele se scoate textul,
  // cu tot cu celulele foii de calcul, deci intra si in inventar, si in
  // verificare. Vezi `lib/cenzorat/office.ts`.
  {
    extensii: [".docx"],
    mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    eticheta: "Word", citibilDeAi: true, inventariabil: true,
  },
  {
    extensii: [".xlsx"],
    mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    eticheta: "Excel", citibilDeAi: true, inventariabil: true,
  },
  // Cele DINAINTE de Office 2007 sunt binare (OLE), nu arhive: nu se desfac cu un
  // zip, deci nu se pot nici citi, nici inventaria. Se pastreaza si se descarca.
  {
    extensii: [".doc"],
    mime: ["application/msword"],
    eticheta: "Word (vechi)", citibilDeAi: false, inventariabil: false,
  },
  {
    extensii: [".xls"],
    mime: ["application/vnd.ms-excel"],
    eticheta: "Excel (vechi)", citibilDeAi: false, inventariabil: false,
  },
  {
    extensii: [".zip"],
    mime: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
    eticheta: "Arhivă ZIP", citibilDeAi: false, inventariabil: false,
  },
  {
    extensii: [".rar"],
    mime: ["application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"],
    eticheta: "Arhivă RAR", citibilDeAi: false, inventariabil: false,
  },
];

export const EXTENSII_ACCEPTATE = FORMATE.flatMap(f => f.extensii);

/** Sirul pentru atributul `accept` al casutei de fisier. */
export const ACCEPT = EXTENSII_ACCEPTATE.join(",");

/** Formatele pe care modelul le poate citi direct, fara conversie. */
export const EXTENSII_CITIBILE = FORMATE.filter(f => f.citibilDeAi).flatMap(f => f.extensii);

export function extensia(nume: string): string {
  const i = nume.lastIndexOf(".");
  return i === -1 ? "" : nume.slice(i).toLowerCase();
}

export function formatul(nume: string): Format | undefined {
  const ext = extensia(nume);
  return FORMATE.find(f => f.extensii.includes(ext));
}

export function esteAcceptat(nume: string): boolean {
  return Boolean(formatul(nume));
}

export function esteArhiva(nume: string): boolean {
  return [".zip", ".rar"].includes(extensia(nume));
}

/** Doar ZIP-ul se poate desface in browser; RAR-ul are nevoie de altceva. */
export function sePoateDesface(nume: string): boolean {
  return extensia(nume) === ".zip";
}

/**
 * Tipul MIME pe care il salvam.
 *
 * Nu ne bazam pe ce spune browserul: la .rar trimite adesea
 * `application/octet-stream`, iar unele sisteme nu trimit nimic. Extensia e ce
 * decide cum va fi servit fisierul mai tarziu, deci ea comanda.
 */
export function mimeDupaNume(nume: string, dinBrowser?: string): string {
  const f = formatul(nume);
  if (!f) return "application/octet-stream";
  if (dinBrowser && f.mime.includes(dinBrowser)) return dinBrowser;
  return f.mime[0];
}

/**
 * Cat incape intr-un singur fisier trimis.
 *
 * Nu e o cifra aleasa de noi: platforma respinge orice cerere peste 4,5 MB cu
 * `FUNCTION_PAYLOAD_TOO_LARGE`, INAINTE ca ruta sa fie chemata — de aceea o
 * incarcare prea mare se vedea ca „documentele nu au putut fi trimise", fara
 * niciun motiv. Masurat pe productie: 4 MB trec, 5 MB nu.
 *
 * De aici vin doua reguli: fisierele pleaca UNUL CATE UNUL, nu tot teancul
 * intr-o cerere, iar imaginile mai grele decat atat se micsoreaza in browser
 * inainte sa plece. Ce ramane peste limita e un PDF mare, si atunci se spune pe
 * nume, nu se ascunde intr-o eroare generica.
 */
export const LIMITA_FISIER_MB = 4;

/** Enumerarea formatelor, pentru mesajele catre om. */
export const FORMATE_TEXT = "PDF, Word, Excel, JPG, PNG, ZIP și RAR";
