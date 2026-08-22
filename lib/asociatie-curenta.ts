import { prisma } from "@/lib/prisma";

/**
 * „Pe ce asociatie lucreaza omul asta acum?" — o singura regula, scrisa o data.
 *
 * Panoul de client (dosare, rapoarte, incarcare) lucreaza intotdeauna pe o
 * asociatie. Pana acum fiecare ruta si-o cauta singura, si nu la fel: unele
 * cereau `user.association`, alta stia si de conturile de firma. Rezultatul era
 * ca PROPRIETARUL aplicatiei — contul cu rol `admin` — primea 401 pe propriile
 * rute de client, fiindca n-avea nicio asociatie legata de el, desi are toate
 * drepturile din aplicatie.
 *
 * Regula, pe roluri:
 *   admin      — proprietarul; primeste un spatiu de lucru propriu, creat la
 *                prima folosire, ca sa poata parcurge fluxul de client
 *                cap-coada fara sa imprumute contul nimanui;
 *   corporate  — prima asociatie de sub contul de firma;
 *   client     — asociatia lui;
 *   cenzor     — niciuna: cenzorul nu incarca dosare, le revizuieste. Vezi
 *                `poateVedeaAsociatia` si pupitrul din /panou/dosar/[id].
 */

type UtilizatorSesiune = {
  id: string;
  role: string;
  name?: string | null;
  email: string;
  association?: { id: string } | null;
};

/** Cat incape in spatiul de lucru al proprietarului: practic, fara plafon. */
const FARA_PLAFON = 999_999;

export async function asociatiaDeLucru(user: UtilizatorSesiune): Promise<string | null> {
  if (user.association?.id) return user.association.id;

  if (user.role === "corporate") {
    const firma = await prisma.corporateAccount.findUnique({
      where: { userId: user.id },
      select: { associations: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 } },
    });
    return firma?.associations[0]?.id ?? null;
  }

  if (user.role === "admin") return spatiulProprietarului(user);

  return null;
}

/**
 * Spatiul de lucru al proprietarului, creat la cerere.
 *
 * Se creeaza o singura data si se repara singur: daca randul dispare din baza,
 * urmatoarea cerere il face la loc, in loc sa lase contul blocat cu un 401 pe
 * care nimeni nu l-ar putea explica.
 */
async function spatiulProprietarului(user: UtilizatorSesiune): Promise<string | null> {
  const existent = await prisma.association.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existent) return existent.id;

  // Contul de firma al proprietarului e creat de pagina panoului; daca lipseste
  // (prima intrare, cont refacut), il facem aici, ca sa nu depindem de ordinea
  // in care sunt deschise ecranele.
  const firma = await prisma.corporateAccount.upsert({
    where: { userId: user.id },
    update: { status: "active", package: "enterprise", maxAssoc: FARA_PLAFON },
    create: {
      userId: user.id,
      companyName: user.name || "VoSmart",
      package: "enterprise",
      status: "active",
      maxAssoc: FARA_PLAFON,
      subscriptionStatus: "active",
      activatedAt: new Date(),
    },
    select: { id: true },
  });

  const creata = await prisma.association.create({
    data: {
      userId: user.id,
      name: "Spațiu de lucru VoSmart",
      corporateId: firma.id,
      package: "premium",
      maxDocuments: FARA_PLAFON,
      subscriptionStatus: "active",
    },
    select: { id: true },
  });
  return creata.id;
}

/**
 * Proprietarul aplicatiei.
 *
 * Rolul `admin` NU e un administrator de asociatie si nici un cenzor cu mai
 * multe butoane: e contul care detine aplicatia. Nu i se aplica limitele
 * comerciale — cota de dosare, pachetul, starea abonamentului — fiindca acelea
 * exista ca sa masoare ce a cumparat un client, iar proprietarul nu cumpara de
 * la el insusi.
 *
 * Limitele TEHNICE raman si pentru el: tipul fisierelor si marimea cererii. Nu
 * sunt reguli de vanzare, sunt marginile pe care le are platforma; ridicate
 * pentru el, s-ar transforma intr-o eroare fara explicatie exact cand e mai
 * putin de folos.
 */
export function esteProprietar(user: { role: string } | null | undefined): boolean {
  return user?.role === "admin";
}
