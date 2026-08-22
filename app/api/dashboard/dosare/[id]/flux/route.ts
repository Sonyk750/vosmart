import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
import { ETAPE, Etapa, INDEX_ETAPA } from "@/lib/cenzorat/tipuri";

/**
 * Unde a ajuns un dosar, in timp real.
 *
 * Ecranul clientului cere ruta asta cat timp dosarul e in lucru. Raspunsul e
 * mic — cateva randuri de jurnal — spre deosebire de lista intreaga de dosare
 * pe care panoul o descarca inainte la fiecare 8 secunde.
 *
 * Bara de progres se calculeaza din etapele chiar incheiate. Cand ceva cade,
 * bara se opreste acolo si scrie de ce, in loc sa urce mai departe spre 90%.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.document.findUnique({
    where: { id },
    select: {
      associationId: true, etapa: true, stareEtapa: true, status: true,
      aiScore: true, verdict: true, incredere: true, inceputLa: true, terminatLa: true,
      evenimente: { orderBy: { createdAt: "asc" }, select: { etapa: true, stare: true, mesaj: true, createdAt: true } },
      _count: { select: { constatari: true } },
    },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });

  if (!(await poateVedeaAsociatia(user, dosar.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const esuat = dosar.stareEtapa === "esuata";
  const indexCurent = INDEX_ETAPA[dosar.etapa as Etapa] ?? 0;

  const etape = ETAPE.map((e, i) => {
    const aleEi = dosar.evenimente.filter(ev => ev.etapa === e.cheie);
    const ultim = aleEi[aleEi.length - 1];
    const stare =
      i < indexCurent ? "gata"
      : i > indexCurent ? "asteptare"
      : dosar.stareEtapa;
    return {
      cheie: e.cheie,
      eticheta: e.eticheta,
      descriere: e.descriere,
      stare,
      mesaj: ultim?.mesaj ?? null,
      la: ultim?.createdAt ?? null,
    };
  });

  // Procentul e ancorat in etape reale: fiecare etapa incheiata valoreaza o
  // felie egala, iar etapa in lucru valoreaza jumatate din felia ei.
  const felie = 100 / ETAPE.length;
  const incheiate = etape.filter(e => e.stare === "gata").length;
  const inLucru = etape.some(e => e.stare === "in_lucru") ? 0.5 : 0;
  const procent = esuat ? Math.round(incheiate * felie) : Math.min(100, Math.round((incheiate + inLucru) * felie));

  return NextResponse.json({
    etapaCurenta: dosar.etapa,
    stare: dosar.stareEtapa,
    esuat,
    procent,
    etape,
    scor: dosar.aiScore,
    verdict: dosar.verdict,
    incredere: dosar.incredere,
    numarConstatari: dosar._count.constatari,
    durataSecunde: dosar.inceputLa && dosar.terminatLa
      ? Math.round((new Date(dosar.terminatLa).getTime() - new Date(dosar.inceputLa).getTime()) / 1000)
      : null,
  });
}
