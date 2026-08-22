import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { SEVERITATI } from "@/lib/cenzorat/tipuri";

/**
 * O constatare scrisa de cenzor.
 *
 * Verificarile automate acopera ce se poate calcula din cifre. Restul — ce a
 * vazut omul in documente si nicio regula n-avea cum sa prinda — intra pe aici
 * si sta in raport alaturi de celelalte, marcata cu sursa „cenzor", ca sa se
 * stie cine a spus-o.
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    select: { contractId: true, _count: { select: { constatari: true } } },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });
  if (!(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const semnat = await prisma.report.findFirst({ where: { dosarId: id, tip: "expert", status: "publicat" }, select: { id: true } });
  if (semnat) {
    return NextResponse.json({ error: "Raportul a fost deja semnat și nu mai poate fi modificat." }, { status: 409 });
  }

  const trup = await req.json().catch(() => ({}));
  const titlu = String(trup.titlu ?? "").trim();
  const detaliu = String(trup.detaliu ?? "").trim();
  const severitate = String(trup.severitate ?? "medie");

  if (titlu.length < 4) return NextResponse.json({ error: "Constatarea are nevoie de un titlu." }, { status: 400 });
  if (!(severitate in SEVERITATI)) return NextResponse.json({ error: "Severitate necunoscută" }, { status: 400 });

  await prisma.constatare.create({
    data: {
      dosarId: id,
      cod: `CENZOR-${dosar._count.constatari + 1}`,
      titlu: titlu.slice(0, 200),
      detaliu: detaliu.slice(0, 4000),
      severitate,
      sursa: "cenzor",
      temei: typeof trup.temei === "string" ? trup.temei.slice(0, 500) || null : null,
      recomandare: typeof trup.recomandare === "string" ? trup.recomandare.slice(0, 2000) || null : null,
      probe: [],
      // Constatarile cenzorului sunt acceptate din start: el le-a scris.
      stare: "acceptata",
      ordine: 1000 + dosar._count.constatari,
    },
  });

  const constatari = await constatariDosar(id);
  const scor = calculeazaScor(constatari);
  await prisma.dosar.update({ where: { id }, data: { scor: scor.valoare, verdict: scor.verdict } });

  return NextResponse.json({ scor, constatari });
}
