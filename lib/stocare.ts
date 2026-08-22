import { put, del, get } from "@vercel/blob";

/**
 * Stocarea dosarelor, intr-un singur loc.
 *
 * Fisierele stau in Vercel Blob, in store PRIVAT (`access: "private"`). Nu e o
 * preferinta de stil: pana acum se scriau in `public/uploads/...`, iar tot ce e
 * sub `public/` se serveste static, fara nicio verificare de sesiune. Cine
 * nimerea adresa descarca lista de plata a altei asociatii fara sa fie macar
 * logat. Cu store privat, adresa singura nu deschide nimic — continutul iese
 * doar prin ruta de descarcare, care intreaba intai a cui e dosarul.
 *
 * Daca `BLOB_READ_WRITE_TOKEN` lipseste (dezvoltare locala, inainte de crearea
 * store-ului), functiile intorc `null` in loc sa arunce: incarcarea si analiza
 * AI merg mai departe, doar ca fisierele nu se pastreaza — exact comportamentul
 * de dinainte. Asa nu pica productia daca variabila nu e inca pusa.
 */

export function stocareConfigurata(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function salveazaFisier(
  cale: string,
  continut: Buffer,
  mimeType: string,
): Promise<{ url: string; size: number } | null> {
  if (!stocareConfigurata()) return null;

  try {
    const blob = await put(cale, continut, {
      access: "private",
      contentType: mimeType,
      // Numele are deja o marca de timp; nu vrem inca un sufix aleator peste ea.
      addRandomSuffix: false,
    });
    return { url: blob.url, size: continut.length };
  } catch (e) {
    console.error("[stocare] Nu am putut salva fisierul:", e);
    return null;
  }
}

/**
 * Aduce continutul unui fisier salvat. Intoarce `null` daca nu mai exista —
 * ruta de descarcare traduce asta intr-un 404, nu intr-o eroare de server.
 */
export async function citesteFisier(
  url: string,
): Promise<{ stream: ReadableStream<Uint8Array>; mimeType: string; size: number } | null> {
  if (!stocareConfigurata()) return null;

  try {
    // Fisierul privat nu se poate lua cu un `fetch` simplu pe adresa lui —
    // tokenul e cel care il deschide, si sta doar pe server.
    const rezultat = await get(url, { access: "private" });
    if (!rezultat || rezultat.statusCode !== 200) return null;
    return {
      stream: rezultat.stream,
      mimeType: rezultat.blob.contentType || "application/octet-stream",
      size: rezultat.blob.size,
    };
  } catch (e) {
    console.error("[stocare] Nu am putut citi fisierul:", e);
    return null;
  }
}

export async function stergeFisiere(urls: string[]): Promise<void> {
  if (!stocareConfigurata() || urls.length === 0) return;

  try {
    await del(urls);
  } catch (e) {
    // Stergerea din baza s-a facut deja; un fisier ramas in Blob e gunoi, nu o
    // problema de securitate — nu oprim raspunsul catre om pentru el.
    console.error("[stocare] Nu am putut sterge fisierele:", e);
  }
}
