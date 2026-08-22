import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { ExtrasDosar } from "@/lib/cenzorat/tipuri";

/**
 * Tot ce ii trebuie cenzorului ca sa decida asupra unui dosar.
 *
 * Inainte, ecranul cenzorului primea un titlu, un scor si o lista de siruri de
 * caractere, iar cand apasa „Draft AI" pornea o A DOUA analiza, cu alt model,
 * care nu vedea documentele — doar resturile primei. Aici cenzorul primeste
 * cifrele citite, constatarile cu probele lor si fisierele; nu se mai genereaza
 * nimic la apasare de buton.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true, title: true, month: true, year: true, status: true,
      etapa: true, stareEtapa: true, aiScore: true, verdict: true, incredere: true,
      extras: true, createdAt: true, terminatLa: true, associationId: true,
      association: { select: { id: true, name: true, cui: true, address: true, phone: true, user: { select: { name: true, email: true } } } },
      files: { select: { id: true, fileName: true, label: true, type: true, mimeType: true, size: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });

  if (!(await poateVedeaAsociatia(user, dosar.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const constatari = await constatariDosar(id);
  const raport = await prisma.report.findFirst({
    where: { documentId: id },
    select: { id: true, status: true, semnatDe: true, semnatLa: true },
  });

  return NextResponse.json({
    dosar: {
      id: dosar.id, titlu: dosar.title, luna: dosar.month, an: dosar.year,
      etapa: dosar.etapa, stareEtapa: dosar.stareEtapa,
      incredere: dosar.incredere, creatLa: dosar.createdAt, terminatLa: dosar.terminatLa,
    },
    asociatie: dosar.association,
    extras: (dosar.extras as ExtrasDosar | null) ?? null,
    fisiere: dosar.files,
    constatari,
    // Scorul se recalculeaza din starea de acum a constatarilor, nu se ia din
    // coloana salvata: cenzorul poate sa fi respins ceva de la ultima citire.
    scor: calculeazaScor(constatari),
    raport,
  });
}
