import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { SEVERITATI, Severitate } from "@/lib/cenzorat/tipuri";

/**
 * Triajul unei constatari de catre cenzor.
 *
 * Asta e momentul in care omul isi pune semnatura pe judecata masinii: accepta,
 * respinge sau schimba severitatea. Raspunsul intoarce scorul recalculat, ca
 * ecranul sa arate pe loc consecinta apasarii — nu la urmatorul refresh.
 *
 * Un raport nu se mai poate atinge dupa ce a fost semnat.
 */

const STARI = ["deschisa", "acceptata", "respinsa"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const constatare = await prisma.constatare.findUnique({
    where: { id },
    select: { documentId: true, document: { select: { associationId: true } } },
  });
  if (!constatare) return NextResponse.json({ error: "Constatare negăsită" }, { status: 404 });

  if (!(await poateVedeaAsociatia(user, constatare.document.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const semnat = await prisma.report.findFirst({
    where: { documentId: constatare.documentId, status: "published" },
    select: { id: true },
  });
  if (semnat) {
    return NextResponse.json({ error: "Raportul a fost deja semnat și nu mai poate fi modificat." }, { status: 409 });
  }

  const trup = await req.json().catch(() => ({}));
  const date: Record<string, unknown> = {};

  if (typeof trup.stare === "string") {
    if (!STARI.includes(trup.stare)) return NextResponse.json({ error: "Stare necunoscută" }, { status: 400 });
    date.stare = trup.stare;
  }
  if (typeof trup.severitate === "string") {
    if (!(trup.severitate in SEVERITATI)) return NextResponse.json({ error: "Severitate necunoscută" }, { status: 400 });
    date.severitate = trup.severitate as Severitate;
  }
  if (typeof trup.notaCenzor === "string") date.notaCenzor = trup.notaCenzor.slice(0, 2000) || null;
  if (typeof trup.temei === "string") date.temei = trup.temei.slice(0, 500) || null;
  if (typeof trup.recomandare === "string") date.recomandare = trup.recomandare.slice(0, 2000) || null;

  if (Object.keys(date).length === 0) {
    return NextResponse.json({ error: "Nimic de modificat" }, { status: 400 });
  }

  await prisma.constatare.update({ where: { id }, data: date });

  const constatari = await constatariDosar(constatare.documentId);
  const scor = calculeazaScor(constatari);

  // Scorul dosarului tine pasul cu deciziile cenzorului, ca lista de dosare sa
  // nu arate alt numar decat pupitrul de revizuire.
  await prisma.document.update({
    where: { id: constatare.documentId },
    data: { aiScore: scor.valoare, verdict: scor.verdict },
  });

  return NextResponse.json({ scor, constatari });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  const constatare = await prisma.constatare.findUnique({
    where: { id },
    select: { sursa: true, documentId: true, document: { select: { associationId: true } } },
  });
  if (!constatare) return NextResponse.json({ error: "Constatare negăsită" }, { status: 404 });
  if (!(await poateVedeaAsociatia(user, constatare.document.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  // Constatarile automate nu se sterg, se resping: asa ramane urma ca regula a
  // semnalat ceva si ca omul a decis altfel. Doar cele scrise de cenzor pot fi
  // sterse cu totul, fiindca sunt ale lui.
  if (constatare.sursa !== "cenzor") {
    return NextResponse.json({ error: "Constatările automate se resping, nu se șterg." }, { status: 400 });
  }

  await prisma.constatare.delete({ where: { id } });
  const constatari = await constatariDosar(constatare.documentId);
  return NextResponse.json({ scor: calculeazaScor(constatari), constatari });
}
