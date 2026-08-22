import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { increderaDate } from "@/lib/cenzorat/reguli";
import { ExtrasDosar } from "@/lib/cenzorat/tipuri";

/**
 * Semnarea raportului.
 *
 * Momentul in care proiectul devine document. Ce se intampla aici:
 *  - constatarile ramase „deschise" se considera acceptate — cenzorul le-a
 *    vazut si nu le-a respins, deci si le insuseste;
 *  - se ingheata datele: raportul pastreaza o copie a constatarilor si a
 *    cifrelor de la momentul semnarii, ca sa nu se schimbe sub semnatura daca
 *    dosarul se reia mai tarziu;
 *  - abia acum raportul devine vizibil clientului.
 *
 * Fara pasul asta, un dosar nerevizuit ajungea la asociatie ca „raport" — exact
 * lucrul pe care un cenzor il pune la semnatura lui.
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.document.findUnique({
    where: { id },
    select: {
      associationId: true, month: true, year: true, extras: true, incredere: true,
      association: { select: { name: true, cui: true, address: true } },
    },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });
  if (!(await poateVedeaAsociatia(user, dosar.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const existent = await prisma.report.findFirst({ where: { documentId: id }, select: { id: true, status: true } });
  if (existent?.status === "published") {
    return NextResponse.json({ error: "Raportul este deja semnat." }, { status: 409 });
  }

  const trup = await req.json().catch(() => ({}));
  const concluzie = typeof trup.concluzie === "string" ? trup.concluzie.trim().slice(0, 8000) : "";

  // „Deschisă" la semnare inseamna „acceptata": cenzorul a trecut prin ea si a
  // lasat-o in picioare.
  await prisma.constatare.updateMany({
    where: { documentId: id, stare: "deschisa" },
    data: { stare: "acceptata" },
  });

  const constatari = await constatariDosar(id);
  const scor = calculeazaScor(constatari);
  const extras = (dosar.extras as ExtrasDosar | null) ?? null;

  const semnatar = user.name || user.email;
  const acum = new Date();
  const titlu = `Raport de cenzor · ${dosar.month ?? ""} ${dosar.year ?? ""} — ${dosar.association?.name ?? ""}`.replace(/\s+/g, " ").trim();

  const dateRaport = {
    versiune: 2,
    asociatie: {
      denumire: dosar.association?.name ?? null,
      cui: dosar.association?.cui ?? null,
      adresa: dosar.association?.address ?? null,
    },
    perioada: { luna: dosar.month, an: dosar.year },
    extras,
    incredere: extras ? increderaDate(extras) : { procent: dosar.incredere ?? 0, gasite: 0, total: 0 },
    scor,
    constatari,
    concluzie: concluzie || null,
    semnatar,
    semnatLa: acum.toISOString(),
  };

  const raport = existent
    ? await prisma.report.update({
        where: { id: existent.id },
        data: {
          title: titlu, data: dateRaport as never, status: "published",
          semnatDe: semnatar, semnatLa: acum, approvedBy: user.id, approvedAt: acum,
        },
      })
    : await prisma.report.create({
        data: {
          associationId: dosar.associationId, documentId: id, title: titlu,
          month: dosar.month, year: dosar.year, data: dateRaport as never,
          status: "published", semnatDe: semnatar, semnatLa: acum,
          approvedBy: user.id, approvedAt: acum,
        },
      });

  await prisma.$transaction([
    prisma.document.update({
      where: { id },
      data: { etapa: "semnat", stareEtapa: "gata", status: "published", aiScore: scor.valoare, verdict: scor.verdict },
    }),
    prisma.evenimentFlux.create({
      data: { documentId: id, etapa: "semnat", stare: "gata", mesaj: `Raport semnat de ${semnatar}` },
    }),
  ]);

  return NextResponse.json({ raportId: raport.id, scor });
}
