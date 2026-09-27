import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
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
    select: { dosarId: true, cod: true, stare: true, severitate: true, dosar: { select: { contractId: true } } },
  });
  if (!constatare) return NextResponse.json({ error: "Constatare negăsită" }, { status: 404 });

  if (!(await poateVedeaContractul(user, constatare.dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const semnat = await prisma.report.findFirst({
    where: { dosarId: constatare.dosarId, tip: "expert", status: "publicat" },
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

  // Cine a decis si cand. „Redeschisa" inseamna nedecisa: urma se sterge, iar
  // semnarea o va cere din nou.
  if (date.stare === "deschisa") {
    date.decisDe = null;
    date.decisLa = null;
  } else if (date.stare || date.severitate) {
    date.decisDe = user.id;
    date.decisLa = new Date();
  }

  // Verificarea „nesemnat" si scrierea intr-un singur pas: o modificare care
  // ajungea exact in timpul semnarii trecea de verificarea de mai sus si schimba
  // o constatare de sub semnatura.
  const scris = await prisma.constatare.updateMany({
    where: { id, dosar: { NOT: { reports: { some: { tip: "expert", status: "publicat" } } } } },
    data: date,
  });
  if (scris.count === 0) {
    return NextResponse.json({ error: "Raportul a fost deja semnat și nu mai poate fi modificat." }, { status: 409 });
  }

  const schimbari = [
    date.stare && date.stare !== constatare.stare ? `stare: ${constatare.stare} → ${date.stare}` : null,
    date.severitate && date.severitate !== constatare.severitate ? `severitate: ${constatare.severitate} → ${date.severitate}` : null,
    "notaCenzor" in date ? "notă" : null,
  ].filter(Boolean);
  if (schimbari.length) {
    await prisma.evenimentFlux.create({
      data: {
        dosarId: constatare.dosarId, etapa: "revizuire", stare: "gata", autorId: user.id,
        mesaj: `${constatare.cod}: ${schimbari.join(", ")} — ${user.name || user.email}`,
      },
    });
  }

  const constatari = await constatariDosar(constatare.dosarId);
  const scor = calculeazaScor(constatari);

  // Scorul dosarului tine pasul cu deciziile cenzorului, ca lista de dosare sa
  // nu arate alt numar decat pupitrul de revizuire.
  await prisma.dosar.update({
    where: { id: constatare.dosarId },
    data: { scor: scor.valoare, verdict: scor.verdict },
  });

  return NextResponse.json({ scor, constatari });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  const constatare = await prisma.constatare.findUnique({
    where: { id },
    select: { sursa: true, dosarId: true, dosar: { select: { contractId: true } } },
  });
  if (!constatare) return NextResponse.json({ error: "Constatare negăsită" }, { status: 404 });
  if (!(await poateVedeaContractul(user, constatare.dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  // Constatarile automate nu se sterg, se resping: asa ramane urma ca regula a
  // semnalat ceva si ca omul a decis altfel. Doar cele scrise de cenzor pot fi
  // sterse cu totul, fiindca sunt ale lui.
  if (constatare.sursa !== "cenzor") {
    return NextResponse.json({ error: "Constatările automate se resping, nu se șterg." }, { status: 400 });
  }

  const sters = await prisma.constatare.deleteMany({
    where: { id, dosar: { NOT: { reports: { some: { tip: "expert", status: "publicat" } } } } },
  });
  if (sters.count === 0) {
    return NextResponse.json({ error: "Raportul a fost deja semnat și nu mai poate fi modificat." }, { status: 409 });
  }
  const constatari = await constatariDosar(constatare.dosarId);
  const scor = calculeazaScor(constatari);
  // Ca dupa orice decizie: lista de dosare arata acelasi scor ca pupitrul.
  await prisma.dosar.update({ where: { id: constatare.dosarId }, data: { scor: scor.valoare, verdict: scor.verdict } });
  return NextResponse.json({ scor, constatari });
}
