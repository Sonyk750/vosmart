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
  /** Poate fi citit de model asa cum e, fara conversie? */
  citibilDeAi: boolean;
};

export const FORMATE: Format[] = [
  { extensii: [".pdf"], mime: ["application/pdf"], eticheta: "PDF", citibilDeAi: true },
  { extensii: [".jpg", ".jpeg"], mime: ["image/jpeg"], eticheta: "JPEG", citibilDeAi: true },
  { extensii: [".png"], mime: ["image/png"], eticheta: "PNG", citibilDeAi: true },
  { extensii: [".webp"], mime: ["image/webp"], eticheta: "WEBP", citibilDeAi: true },
  {
    extensii: [".doc", ".docx"],
    mime: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    eticheta: "Word", citibilDeAi: false,
  },
  {
    extensii: [".xls", ".xlsx"],
    mime: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    eticheta: "Excel", citibilDeAi: false,
  },
  {
    extensii: [".zip"],
    mime: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
    eticheta: "Arhivă ZIP", citibilDeAi: false,
  },
  {
    extensii: [".rar"],
    mime: ["application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"],
    eticheta: "Arhivă RAR", citibilDeAi: false,
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

/** Cat incape intr-o singura incarcare. */
export const LIMITA_MB = 50;

/** Enumerarea formatelor, pentru mesajele catre om. */
export const FORMATE_TEXT = "PDF, Word, Excel, JPG, PNG, ZIP și RAR";
