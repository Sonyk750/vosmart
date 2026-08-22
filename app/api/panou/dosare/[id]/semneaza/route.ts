import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { increderaDate } from "@/lib/cenzorat/reguli";
import { ExtrasDosar } from "@/lib/cenzorat/tipuri";

/**
 * Semnarea raportului de expert.
 *
 * Momentul in care proiectul devine document. Ce se intampla aici:
 *  - constatarile ramase „deschise" se considera acceptate — cenzorul le-a
 *    vazut si nu le-a respins, deci si le insuseste;
 *  - se ingheata datele: raportul pastreaza o copie a constatarilor si a
 *    cifrelor de la momentul semnarii, ca sa nu se schimbe sub semnatura daca
 *    dosarul se reia mai tarziu;
 *  - raportul AI ramane in dosar, alaturi. Nu e inlocuit: unul spune ce a
 *    constatat masina, celalalt ce a constatat si a semnat omul.
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    include: { contract: { select: { id: true, denumire: true, cui: true, adresa: true } } },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });
  if (!(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const existent = await prisma.report.findUnique({
    where: { dosarId_tip: { dosarId: id, tip: "expert" } },
    select: { id: true, status: true },
  });
  if (existent?.status === "publicat") {
    return NextResponse.json({ error: "Raportul este deja semnat." }, { status: 409 });
  }

  const trup = await req.json().catch(() => ({}));
  const concluzie = typeof trup.concluzie === "string" ? trup.concluzie.trim().slice(0, 8000) : "";

  // „Deschisă" la semnare inseamna „acceptata": cenzorul a trecut prin ea si a
  // lasat-o in picioare.
  await prisma.constatare.updateMany({
    where: { dosarId: id, stare: "deschisa" },
    data: { stare: "acceptata" },
  });

  const constatari = await constatariDosar(id);
  const scor = calculeazaScor(constatari);
  const extras = (dosar.extras as ExtrasDosar | null) ?? null;

  const semnatar = user.name || user.email;
  const acum = new Date();
  const titlu = `Raport de cenzor · ${dosar.luna} ${dosar.an} — ${dosar.contract.denumire}`;

  const dateRaport = {
    versiune: 2,
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
    semnatar,
    semnatLa: acum.toISOString(),
  };

  const raport = await prisma.report.upsert({
    where: { dosarId_tip: { dosarId: id, tip: "expert" } },
    update: { titlu, date: dateRaport as never, status: "publicat", semnatDe: semnatar, semnatLa: acum },
    create: {
      dosarId: id, contractId: dosar.contractId, tip: "expert",
      titlu, date: dateRaport as never, status: "publicat", semnatDe: semnatar, semnatLa: acum,
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.dosar.update({
      where: { id },
      data: { etapa: "semnat", stareEtapa: "gata", scor: scor.valoare, verdict: scor.verdict },
    }),
    prisma.evenimentFlux.create({
      data: { dosarId: id, etapa: "semnat", stare: "gata", mesaj: `Raport semnat de ${semnatar}` },
    }),
  ]);

  return NextResponse.json({ raportId: raport.id, scor });
}
