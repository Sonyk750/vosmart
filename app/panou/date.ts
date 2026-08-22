import { prisma } from "@/lib/prisma";
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
 * Ce vede fiecare. Proprietarul vede toate contractele; cenzorul, doar cele care
 * i-au fost alocate — aceeasi regula ca in `lib/acces.ts`, scrisa aici ca filtru
 * de interogare.
 */
function filtruContracte(user: Utilizator) {
  if (user.role === "cenzor") {
    return { allocations: { some: { cenzorId: user.id } } };
  }
  // Spatiul de lucru al proprietarului nu e un contract cu un client: e propriul
  // lui teren de incercare. N-are ce cauta in numaratoarea de contracte.
  return { user: { role: { not: "admin" } } };
}

function filtruDosare(user: Utilizator) {
  return { association: filtruContracte(user) };
}

export async function numaratoriMeniu(user: Utilizator): Promise<Numaratori> {
  const dosare = filtruDosare(user);
  const [deVerificat, laExpert] = await Promise.all([
    // Documente primite si inventariate, pentru care nu s-a rulat inca verificarea.
    prisma.document.count({ where: { ...dosare, etapa: { in: ["intrare", "extragere"] }, stareEtapa: { not: "esuata" } } }),
    // Verificarea automata s-a terminat; asteapta omul.
    prisma.document.count({ where: { ...dosare, etapa: "revizuire" } }),
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

const LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

/** Luna la care se lucreaza acum: cea incheiata, nu cea in curs. */
export function lunaDeLucru(acum = new Date()): { luna: string; an: number; eticheta: string } {
  const d = new Date(acum.getFullYear(), acum.getMonth() - 1, 1);
  return { luna: LUNI[d.getMonth()], an: d.getFullYear(), eticheta: `${LUNI[d.getMonth()]} ${d.getFullYear()}` };
}

export async function sumarPanou(user: Utilizator): Promise<SumarPanou> {
  const contracteUnde = filtruContracte(user);
  const dosare = filtruDosare(user);
  const { luna, an, eticheta } = lunaDeLucru();
  const lunaAsta = { ...dosare, month: luna, year: an };

  const [
    contracte, dosareLunaCurenta, rapoarteAi, rapoarteExpert,
    deVerificat, laExpert, esuate, dupaEtapa,
  ] = await Promise.all([
    prisma.association.count({ where: contracteUnde }),
    prisma.document.count({ where: lunaAsta }),
    // Raportul AI exista din momentul in care verificarea a produs date.
    prisma.report.count({ where: { association: contracteUnde, data: { not: undefined } } }),
    // Raportul expertului e cel semnat de om.
    prisma.report.count({ where: { association: contracteUnde, semnatLa: { not: null } } }),
    prisma.document.count({ where: { ...dosare, etapa: { in: ["intrare", "extragere"] }, stareEtapa: { not: "esuata" } } }),
    prisma.document.count({ where: { ...dosare, etapa: "revizuire" } }),
    prisma.document.count({ where: { ...dosare, stareEtapa: "esuata" } }),
    prisma.document.groupBy({ by: ["etapa"], where: lunaAsta, _count: { _all: true } }),
  ]);

  // Coloanele fluxului, in ordinea in care se intampla lucrurile. „Fara
  // documente" nu se numara din dosare — se scade: sunt contractele care n-au
  // trimis nimic pentru luna asta.
  const dupaCheie = new Map(dupaEtapa.map(g => [g.etapa, g._count._all]));
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
