import { prisma } from "@/lib/prisma";

/**
 * Cand e un dosar inchis la modificari si cand lucreaza AI-ul pe el — o singura
 * regula, scrisa o data.
 *
 * DE CE NU `etapa === "semnat"`.
 *
 * `etapa` e scrisa si de fluxul AI (`noteaza`). O analiza care se termina DUPA
 * semnare muta etapa inapoi pe „revizuire", iar toate gardurile care se uitau la
 * ea se deschideau: dosarul se putea reciti, completa, chiar sterge — si prin
 * cascada pleca si raportul semnat. Ce sustine o semnatura nu poate depinde de un
 * camp pe care il mai scrie si altcineva. Semnatura e raportul `expert` publicat,
 * iar el nu se mai modifica dupa ce exista.
 */

export async function areRaportSemnat(dosarId: string): Promise<boolean> {
  const r = await prisma.report.findFirst({
    where: { dosarId, tip: "expert", status: "publicat" },
    select: { id: true },
  });
  return Boolean(r);
}

/**
 * Cat poate sta un dosar „in lucru" fara niciun semn de viata.
 *
 * Analiza ruleaza in `after()`, cu limita de 300 s a functiei. Cand platforma o
 * opreste la limita, blocul de erori nu mai apuca sa ruleze, iar dosarul ramanea
 * „in lucru" pentru totdeauna: reluarea era refuzata, butonul dezactivat, fara
 * nicio iesire. Fiecare pas al analizei scrie in dosar (`noteaza`), deci
 * `updatedAt` e bataia inimii ei; dupa 10 minute fara ea, analiza e moarta.
 */
export const IN_LUCRU_EXPIRA_MS = 10 * 60 * 1000;

export function inLucruActiv(d: { stareEtapa: string; updatedAt: Date }): boolean {
  return d.stareEtapa === "in_lucru" && Date.now() - d.updatedAt.getTime() < IN_LUCRU_EXPIRA_MS;
}

/** Aceeasi intrebare, pentru ecran: analiza a murit si poate fi reluata. */
export function inLucruExpirat(d: { stareEtapa: string; updatedAt: Date }): boolean {
  return d.stareEtapa === "in_lucru" && !inLucruActiv(d);
}
