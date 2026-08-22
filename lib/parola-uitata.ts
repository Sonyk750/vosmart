import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LUNGIME_COD, ALFABET_COD, normalizeazaCod, parolaValida } from "@/lib/parola-cod";

export { LUNGIME_COD, normalizeazaCod };

/**
 * Resetarea parolei cu un cod primit pe email — regula, intr-un singur loc.
 *
 * Pana acum aplicatia n-avea nicio iesire pentru omul care isi uita parola:
 * singura schimbare posibila era din cont, adica exact acolo unde nu poate
 * ajunge cine si-a uitat-o.
 *
 * S-a ales cod, nu link:
 * - linkul dintr-un email se deschide in browserul implicit, nu neaparat acela
 *   in care omul e obisnuit sa intre; codul se tasteaza acolo unde deja esti;
 * - filtrele antispam rescriu si „preclick"-uiesc linkurile, deci un link se
 *   poate consuma singur inainte sa ajunga omul la el;
 * - codul se poate citi cu voce tare, la telefon, cand cineva ajuta un client.
 *
 * Trei alegeri care NU se rescriu pe loc in rute:
 *
 * 1. In baza NU sta codul, ci `sha256(cod)`. Cine citeste tabela nu poate intra
 *    pe niciun cont — amprenta nu se intoarce inapoi.
 * 2. Un singur cod activ per adresa: cererea noua le sterge pe cele vechi.
 * 3. Cinci incercari gresite si codul moare, ca sa nu poata fi ghicit prin
 *    incercari repetate. 31^8 combinatii inseamna ca 5 incercari nu ajung.
 */

export const MINUTE_VALABILITATE = 30;
export const MAX_INCERCARI = 5;

export function genereazaCod(): string {
  // `randomInt` respinge singur valorile care ar strica distributia uniforma;
  // `% 31` pe un octet ar fi facut primele 8 simboluri mai probabile decat restul.
  let cod = "";
  for (let i = 0; i < LUNGIME_COD; i++) cod += ALFABET_COD[crypto.randomInt(ALFABET_COD.length)];
  return cod;
}

function amprenta(cod: string): string {
  return crypto.createHash("sha256").update(normalizeazaCod(cod)).digest("hex");
}

function adresa(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creeaza un cod pentru adresa data si il intoarce (secretul care pleaca in
 * email). Intoarce `null` daca adresa n-are cont — dar apelantul NU are voie sa
 * spuna asta mai departe: raspunsul catre browser trebuie sa fie acelasi in
 * ambele cazuri, altfel ruta devine un instrument de aflat cine are cont.
 */
export async function creeazaCodResetare(
  email: string,
): Promise<{ cod: string; user: { id: string; email: string; name: string | null } } | null> {
  const e = adresa(email);
  if (!e) return null;

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { id: true, email: true, name: true, password: true, status: true },
  });
  // Contul respins nu mai are unde intra, deci n-are ce reseta.
  if (!user || !user.password || user.status === "rejected") return null;

  // Un singur cod activ: cele vechi mor acum.
  await prisma.codResetareParola.deleteMany({ where: { email: e } });

  const cod = genereazaCod();
  await prisma.codResetareParola.create({
    data: {
      email: e,
      codHash: amprenta(cod),
      expiraLa: new Date(Date.now() + MINUTE_VALABILITATE * 60 * 1000),
    },
  });

  return { cod, user: { id: user.id, email: user.email, name: user.name } };
}

export type RezultatCod =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; motiv: "lipsa" | "expirat" | "gresit" | "epuizat" | "parola-slaba"; incercariRamase?: number };

/**
 * Verifica doar codul, fara sa schimbe nimic si fara sa-l consume.
 *
 * Ecranul are nevoie de asta separat: campurile pentru parola noua apar abia
 * DUPA ce codul e confirmat, deci nu se poate verifica si scrie deodata.
 *
 * Ca sa nu devina o portita, codul se verifica din nou la scriere, iar
 * numaratoarea incercarilor gresite e comuna. Cine ghiceste orbeste are tot 5
 * sanse la 31^8 combinatii, indiferent pe ce ruta bate.
 */
export async function verificaCod(email: string, codBrut: string): Promise<RezultatCod> {
  const e = adresa(email);
  const cod = normalizeazaCod(codBrut);

  const rand = await prisma.codResetareParola.findFirst({
    where: { email: e },
    orderBy: { createdAt: "desc" },
  });
  if (!rand) return { ok: false, motiv: "lipsa" };

  if (rand.expiraLa.getTime() < Date.now()) {
    await prisma.codResetareParola.deleteMany({ where: { email: e } });
    return { ok: false, motiv: "expirat" };
  }

  if (rand.incercari >= MAX_INCERCARI) {
    await prisma.codResetareParola.deleteMany({ where: { email: e } });
    return { ok: false, motiv: "epuizat" };
  }

  // Comparatie in timp constant: `===` pe siruri iese mai devreme la prima
  // diferenta, iar diferenta de timp se poate masura.
  const asteptat = Buffer.from(rand.codHash, "hex");
  const primit = Buffer.from(amprenta(cod), "hex");
  const potrivit = asteptat.length === primit.length && crypto.timingSafeEqual(asteptat, primit);

  if (!potrivit) {
    const dupa = await prisma.codResetareParola.update({
      where: { id: rand.id },
      data: { incercari: { increment: 1 } },
      select: { incercari: true },
    });
    const ramase = Math.max(0, MAX_INCERCARI - dupa.incercari);
    if (ramase === 0) {
      await prisma.codResetareParola.deleteMany({ where: { email: e } });
      return { ok: false, motiv: "epuizat" };
    }
    return { ok: false, motiv: "gresit", incercariRamase: ramase };
  }

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user || user.status === "rejected") {
    await prisma.codResetareParola.deleteMany({ where: { email: e } });
    return { ok: false, motiv: "lipsa" };
  }

  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}

/**
 * Pune parola noua, dupa ce verifica INCA O DATA codul.
 *
 * Verificarea se repeta dinadins: ecranul a confirmat codul mai devreme, dar
 * ecranul nu e o dovada — intre cele doua cereri poate veni oricine, cu orice.
 * Singurul lucru care da dreptul de scriere e codul insusi, aici si acum.
 */
export async function schimbaParolaCuCod(email: string, codBrut: string, parolaNoua: string): Promise<RezultatCod> {
  if (!parolaValida(parolaNoua)) return { ok: false, motiv: "parola-slaba" };

  const r = await verificaCod(email, codBrut);
  if (!r.ok) return r;

  // 12 runde, ca peste tot in aplicatie (inregistrare, migrarea de la SHA-256):
  // o parola pusa aici trebuie sa fie la fel de scumpa de spart ca oricare alta.
  await prisma.user.update({
    where: { id: r.user.id },
    data: { password: await bcrypt.hash(parolaNoua, 12) },
  });

  // Sesiunile vechi cad. Daca parola a fost schimbata pentru ca stia altcineva
  // de ea, cel care era deja logat trebuie sa iasa afara odata cu schimbarea.
  await prisma.session.deleteMany({ where: { userId: r.user.id } });
  await prisma.codResetareParola.deleteMany({ where: { email: adresa(email) } });

  return { ok: true, user: r.user };
}
