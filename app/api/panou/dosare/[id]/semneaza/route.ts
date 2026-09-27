import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor, VERDICTE } from "@/lib/cenzorat/scor";
import { increderaDate } from "@/lib/cenzorat/reguli";
import { ExtrasDosar } from "@/lib/cenzorat/tipuri";
import { inLucruActiv } from "@/lib/cenzorat/blocare";
import { amprentaRaport } from "@/lib/cenzorat/amprenta";

/**
 * Semnarea raportului de expert.
 *
 * Momentul in care proiectul devine document. Ce cere si ce face:
 *
 *  - dosarul trebuie sa fi trecut prin verificare si sa astepte revizuirea. Un
 *    dosar neanalizat (sau cu analiza in lucru) nu se semneaza: ar iesi „Conform
 *    100%" doar pentru ca n-are constatari;
 *  - fiecare constatare trebuie DECISA de cenzor (acceptata sau respinsa).
 *    Inainte, cele ramase deschise se considerau acceptate in tacere — adica
 *    omul semna constatari pe care poate nici nu le deschisese;
 *  - cenzorul spune explicit daca lista lunii are BUN DE PLATA. E decizia lui,
 *    nu a scorului. Cand spune „da" peste un verdict rau, trebuie sa scrie de ce;
 *  - se ingheata datele: copia raportului, lista documentelor cu amprenta lor si
 *    sha256 al intregului continut. Raportul trimis asociatiei se poate compara
 *    cu ce s-a semnat;
 *  - totul intr-o singura tranzactie, cu dosarul luat conditionat: din doua
 *    semnari simultane, doar una trece.
 *
 * Semnarea NU trimite nimic. Trimiterea e un pas separat, facut de om, cu
 * destinatarii vazuti (vezi `trimite/route.ts`).
 */

class Refuz extends Error {
  constructor(public mesaj: string, public cod: number) { super(mesaj); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    include: {
      contract: { select: { id: true, denumire: true, cui: true, adresa: true } },
      fisiere: { select: { numeFisier: true, tip: true, amprenta: true, cont: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });
  if (!(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  if (inLucruActiv(dosar)) {
    return NextResponse.json({ error: "Verificarea AI lucrează acum pe dosar. Semnează după ce se termină." }, { status: 409 });
  }
  if (dosar.etapa !== "revizuire" && dosar.etapa !== "semnat") {
    return NextResponse.json(
      { error: "Dosarul nu a trecut încă prin verificare. Pornește verificarea și revizuiește constatările înainte de semnare." },
      { status: 409 },
    );
  }

  const trup = await req.json().catch(() => ({}));
  const concluzie = typeof trup.concluzie === "string" ? trup.concluzie.trim().slice(0, 8000) : "";
  if (typeof trup.bunDePlata !== "boolean") {
    return NextResponse.json({ error: "Alege dacă lista lunii are „bun de plată” sau nu." }, { status: 400 });
  }
  const bunDePlata: boolean = trup.bunDePlata;

  const constatari = await constatariDosar(id);
  const nedecise = constatari.filter(c => c.stare === "deschisa");
  if (nedecise.length > 0) {
    return NextResponse.json({
      error: `Mai sunt ${nedecise.length} ${nedecise.length === 1 ? "constatare nedecisă" : "constatări nedecise"}. Acceptă sau respinge fiecare constatare înainte de semnare.`,
      nedecise: nedecise.map(c => ({ id: c.id, titlu: c.titlu })),
    }, { status: 409 });
  }

  const scor = calculeazaScor(constatari);
  // „Bun de plata" peste un verdict rau se poate da — cenzorul poate avea
  // motivele lui — dar nu fara sa le scrie. Raportul semnat trebuie sa explice
  // de ce lista s-a aprobat cu deficiente constatate.
  if (bunDePlata && scor.verdict !== "conform" && scor.verdict !== "observatii" && concluzie.length < 20) {
    return NextResponse.json({
      error: `Verdictul este „${VERDICTE[scor.verdict].eticheta}”. Pentru „bun de plată” scrie în concluzie de ce lista se poate totuși afișa.`,
    }, { status: 400 });
  }

  const extras = (dosar.extras as ExtrasDosar | null) ?? null;
  const semnatar = user.name || user.email;
  const acum = new Date();
  const titlu = `Raport de cenzor · ${dosar.luna} ${dosar.an} — ${dosar.contract.denumire}`;

  const dateRaport = {
    versiune: 3,
    asociatie: {
      denumire: dosar.contract.denumire,
      cui: dosar.contract.cui,
      adresa: dosar.contract.adresa,
    },
    perioada: { luna: dosar.luna, an: dosar.an },
    extras,
    incredere: extras ? increderaDate(extras) : { procent: dosar.incredere ?? 0, gasite: 0, total: 0 },
    scor,
    constatari,
    concluzie: concluzie || null,
    bunDePlata,
    // Ce s-a verificat: documentele, fiecare cu amprenta lui. Fara lista asta,
    // un document schimbat dupa semnare n-ar putea fi deosebit de cel verificat.
    documente: dosar.fisiere.map(f => ({ numeFisier: f.numeFisier, tip: f.tip, amprenta: f.amprenta, cont: f.cont })),
    semnatar,
    semnatarId: user.id,
    semnatLa: acum.toISOString(),
  };
  const amprenta = amprentaRaport(dateRaport);

  try {
    const raport = await prisma.$transaction(async tx => {
      // Dosarul se ia conditionat: nesemnat si inca in revizuire. A doua semnare
      // simultana gaseste zero randuri si se opreste aici.
      const luat = await tx.dosar.updateMany({
        where: { id, etapa: "revizuire", NOT: { reports: { some: { tip: "expert", status: "publicat" } } } },
        data: { etapa: "semnat", stareEtapa: "gata", scor: scor.valoare, verdict: scor.verdict },
      });
      if (luat.count === 0) throw new Refuz("Raportul este deja semnat.", 409);

      const r = await tx.report.upsert({
        where: { dosarId_tip: { dosarId: id, tip: "expert" } },
        update: {
          titlu, date: dateRaport as never, status: "publicat",
          semnatDe: semnatar, semnatDeId: user.id, semnatLa: acum, amprenta, bunDePlata,
        },
        create: {
          dosarId: id, contractId: dosar.contractId, tip: "expert",
          titlu, date: dateRaport as never, status: "publicat",
          semnatDe: semnatar, semnatDeId: user.id, semnatLa: acum, amprenta, bunDePlata,
        },
        select: { id: true },
      });
      await tx.evenimentFlux.create({
        data: {
          dosarId: id, etapa: "semnat", stare: "gata", autorId: user.id,
          mesaj: `Raport semnat de ${semnatar} · ${VERDICTE[scor.verdict].eticheta} · ${bunDePlata ? "BUN DE PLATĂ" : "fără bun de plată"} · amprentă ${amprenta.slice(0, 12)}`,
        },
      });
      return r;
    });
    return NextResponse.json({ raportId: raport.id, scor, amprenta, bunDePlata });
  } catch (e) {
    if (e instanceof Refuz) return NextResponse.json({ error: e.mesaj }, { status: e.cod });
    throw e;
  }
}
