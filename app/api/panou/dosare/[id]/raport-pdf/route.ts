import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { raportSemnatPentruIesire } from "@/lib/cenzorat/raport-semnat";

/**
 * PDF-ul raportului semnat — exact documentul care pleaca pe email.
 *
 * Il descarca cenzorul (ca sa vada ce trimite) si clientul contractului. Exista
 * doar pentru rapoarte semnate: un proiect nesemnat nu iese din aplicatie ca
 * document.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  const dosar = await prisma.dosar.findUnique({ where: { id }, select: { contractId: true } });
  if (!dosar || !(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Raport negăsit" }, { status: 404 });
  }

  const r = await raportSemnatPentruIesire(id);
  if ("eroare" in r) return NextResponse.json({ error: r.eroare }, { status: r.cod });

  return new NextResponse(new Uint8Array(r.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.numeFisier}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
