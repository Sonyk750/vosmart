import crypto from "crypto";
import { ALFABET_COD, LUNGIME_COD, normalizeazaCod } from "@/lib/parola-cod";

/**
 * Accesul la caietul de service — doua incuietori, una dupa alta.
 *
 * 1. CONTUL. Pagina si rutele ei exista doar pentru ADRESA_SERVICE, potrivire
 *    exacta. Nu exista cale ocolita: nici rolul de proprietar, nici cenzorul.
 *    Cine nu e ea primeste 404, nu "acces interzis" — un refuz explicit ar
 *    spune ca exista ceva de vazut aici.
 *
 * 2. CODUL. Un cod de 8 caractere plecat pe email. Aici NU se stocheaza nimic in
 *    baza, spre deosebire de resetarea parolei: codul se DERIVA dintr-un secret
 *    al serverului si din fereastra de timp curenta, iar la verificare se
 *    recalculeaza. Acelasi principiu ca la aplicatiile de autentificare cu cod.
 *
 *    De ce fara tabela: pentru un singur cont, o tabela noua ar fi insemnat o
 *    migrare pe baza de productie pentru patru coloane care traiesc 30 de
 *    minute. Derivarea nu are nevoie de scriere, deci nici de migrare.
 */

/** Cat traieste un cod: minim atat, maxim dublu (se accepta si fereastra anterioara). */
export const MINUTE_FEREASTRA = 30;

/** Cat tine accesul dupa ce codul a fost acceptat. */
export const ORE_SESIUNE = 8;

export const COOKIE_SERVICE = "caiet_service";

/**
 * Adresa contului de service — contul de proprietar al aplicatiei.
 *
 * Scrisa aici, nu intr-o variabila de mediu: nu e un secret, e adresa firmei,
 * iar o variabila uitata nesetata ar face butonul invizibil pe un deploy care
 * altfel arata reusit. Se schimba aici, intr-un singur loc.
 */
const ADRESA_SERVICE = "office@vosmart.ro";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
  if (!s) throw new Error("Lipseste NEXTAUTH_SECRET.");
  return s;
}

function adresaService(): string {
  return (process.env.CAIET_SERVICE_EMAIL || ADRESA_SERVICE).trim().toLowerCase();
}

/** Adresa la care pleaca codul. Aceeasi cu a contului: nu are unde altundeva. */
export function emailService(): string {
  return adresaService();
}

/**
 * Contul are voie la caiet? Potrivire exacta pe adresa, atat.
 */
export function esteContService(email: string | null | undefined): boolean {
  const permis = adresaService();
  const e = (email || "").trim().toLowerCase();
  return e !== "" && e === permis;
}

function fereastraCurenta(): number {
  return Math.floor(Date.now() / (MINUTE_FEREASTRA * 60 * 1000));
}

/**
 * Codul ferestrei date. Octetii amprentei se aseaza pe alfabetul codului —
 * acelasi alfabet ca la resetarea parolei, fara 0/O si 1/I/L, ca sa nu se
 * greseasca la transcrierea din email.
 */
function codPentru(fereastra: number): string {
  const h = crypto.createHmac("sha256", secret())
    .update(`caiet-service:${adresaService()}:${fereastra}`)
    .digest();
  let cod = "";
  for (let i = 0; i < LUNGIME_COD; i++) cod += ALFABET_COD[h[i] % ALFABET_COD.length];
  return cod;
}

export function codCurent(): string {
  return codPentru(fereastraCurenta());
}

/**
 * Codul e bun? Se accepta si fereastra anterioara: altfel un cod cerut la
 * secunda 29:59 ar muri inainte sa ajunga emailul.
 */
export function verificaCodService(brut: string): boolean {
  const dat = normalizeazaCod(brut);
  if (dat.length !== LUNGIME_COD) return false;
  const f = fereastraCurenta();
  return [codPentru(f), codPentru(f - 1)].some(
    (bun) => crypto.timingSafeEqual(Buffer.from(bun), Buffer.from(dat)),
  );
}

/* ─── Biletul de intrare, dupa ce codul a fost acceptat ───────────────────── */

/** Semnat, cu termen inauntru: cookie-ul singur nu deschide nimic fara semnatura. */
export function creeazaBilet(): string {
  const pana = Date.now() + ORE_SESIUNE * 3600 * 1000;
  const semn = crypto.createHmac("sha256", secret()).update(`bilet:${pana}`).digest("hex").slice(0, 32);
  return `${pana}.${semn}`;
}

export function biletValid(bilet: string | undefined): boolean {
  if (!bilet) return false;
  const [panaStr, semn] = bilet.split(".");
  const pana = Number(panaStr);
  if (!pana || !semn || Date.now() > pana) return false;
  const bun = crypto.createHmac("sha256", secret()).update(`bilet:${pana}`).digest("hex").slice(0, 32);
  return semn.length === bun.length && crypto.timingSafeEqual(Buffer.from(semn), Buffer.from(bun));
}
