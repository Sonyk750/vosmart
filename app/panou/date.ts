import { prisma } from "@/lib/prisma";
import { lunaDeLucru } from "@/lib/luni";
import type { Numaratori } from "./Cadru";

/**
 * Cifrele care alimenteaza panoul si numerele din meniu.
 *
 * Stau intr-un singur loc fiindca aceleasi intrebari se pun in doua ecrane, iar
 * doua numaratori scrise separat ajung inevitabil sa nu semene: meniul ar arata
 * „3 la expert", panoul „2", si n-ai sti pe care sa-l crezi.
 */

type Utilizator = { id: string; role: string };

/**
 * Ce vede fiecare.
 *
 * Proprietarul vede toate contractele. Cenzorul le vede pe cele care i-au fost
 * repartizate — deocamdata niciunul nu e repartizat, fiindca nu exista inca
 * conturi de cenzor; cand vor exista, filtrul e deja aici si nu se mai umbla
 * prin ecrane.
 */
function filtruContracte(user: Utilizator) {
  if (user.role === "cenzor") return { cenzorId: user.id };
  return {};
}

function filtruDosare(user: Utilizator) {
  if (user.role === "cenzor") return { contract: { cenzorId: user.id } };
  return {};
}

export async function numaratoriMeniu(user: Utilizator): Promise<Numaratori> {
  const dosare = filtruDosare(user);
  const [deVerificat, laExpert] = await Promise.all([
    // Documente primite si inventariate, pentru care nu s-a rulat inca verificarea.
    prisma.dosar.count({ where: { ...dosare, etapa: { in: ["intrare", "extragere"] }, stareEtapa: { not: "esuata" } } }),
    // Verificarea automata s-a terminat; asteapta omul.
    prisma.dosar.count({ where: { ...dosare, etapa: "revizuire" } }),
  ]);
  return { deVerificat, laExpert };
}

export type SumarPanou = {
  contracte: number;
  dosareLunaCurenta: number;
  rapoarteAi: number;
  rapoarteExpert: number;
  deVerificat: number;
  laExpert: number;
  esuate: number;
  /** Cate contracte se afla in fiecare etapa, pentru luna in curs. */
  pePozitii: { etapa: string; eticheta: string; numar: number }[];
  lunaCurenta: string;
};

// Lunile si „luna de lucru" stau in `lib/luni.ts`, modul neutru: de acolo le pot
// citi si ecranele de client, care n-au voie sa atinga Prisma.
export { lunaDeLucru };

export async function sumarPanou(user: Utilizator): Promise<SumarPanou> {
  const contracteUnde = filtruContracte(user);
  const dosare = filtruDosare(user);
  const { luna, an, eticheta } = lunaDeLucru();
  const lunaAsta = { ...dosare, luna, an };

  const [
    contracte, dosareLunaCurenta, rapoarteAi, rapoarteExpert,
    deVerificat, laExpert, esuate, dupaEtapa,
  ] = await Promise.all([
    prisma.contract.count({ where: { ...contracteUnde, status: "activ" } }),
    prisma.dosar.count({ where: lunaAsta }),
    // Raportul AI e gata cand verificarea automata s-a incheiat, adica atunci
    // cand dosarul a ajuns la revizuire. Numaram dosarele, nu randurile din
    // `Report` cu `data` completat: un filtru pe camp Json nu compara ce pare ca
    // compara si ar fi intors linistit toate randurile.
    prisma.dosar.count({ where: { ...dosare, etapa: { in: ["revizuire", "semnat"] } } }),
    // Raportul expertului e cel semnat de om.
    prisma.report.count({ where: { semnatLa: { not: null } } }),
    prisma.dosar.count({ where: { ...dosare, etapa: { in: ["intrare", "extragere"] }, stareEtapa: { not: "esuata" } } }),
    prisma.dosar.count({ where: { ...dosare, etapa: "revizuire" } }),
    prisma.dosar.count({ where: { ...dosare, stareEtapa: "esuata" } }),
    prisma.dosar.groupBy({ by: ["etapa"], where: lunaAsta, _count: { _all: true } }),
  ]);

  // Coloanele fluxului, in ordinea in care se intampla lucrurile. „Fara
  // documente" nu se numara din dosare — se scade: sunt contractele care n-au
  // trimis nimic pentru luna asta.
  const dupaCheie = new Map<string, number>(dupaEtapa.map(g => [g.etapa, g._count._all]));
  const primite = (dupaCheie.get("intrare") ?? 0) + (dupaCheie.get("extragere") ?? 0);
  const verificate = (dupaCheie.get("verificare") ?? 0) + (dupaCheie.get("sinteza") ?? 0);

  const pePozitii = [
    { etapa: "lipsa", eticheta: "Fără documente", numar: Math.max(0, contracte - dosareLunaCurenta) },
    { etapa: "primite", eticheta: "Documente primite", numar: primite },
    { etapa: "verificare", eticheta: "Se verifică", numar: verificate },
    { etapa: "revizuire", eticheta: "La expert", numar: dupaCheie.get("revizuire") ?? 0 },
    { etapa: "semnat", eticheta: "Semnat", numar: dupaCheie.get("semnat") ?? 0 },
  ];

  return {
    contracte, dosareLunaCurenta, rapoarteAi, rapoarteExpert,
    deVerificat, laExpert, esuate, pePozitii, lunaCurenta: eticheta,
  };
}
