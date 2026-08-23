import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaDosarul } from "@/lib/acces";
import { ruleazaFlux } from "@/lib/cenzorat/pipeline";

/**
 * Pornirea verificarii pe un dosar deja strans.
 *
 * Incarcarea si verificarea sunt doua apasari diferite, dinadins. Asociatia
 * trimite documentele in trei transe, iar o verificare pornita la fiecare transa
 * ar citi de trei ori acelasi dosar pe jumatate — o data degeaba si de doua ori
 * pe bani. Cenzorul spune el cand dosarul e destul de plin cat sa merite citit.
 *
 * Se poate relua oricat: constatarile venite din reguli si din model se rescriu
 * de la zero la fiecare rulare (vezi `ruleazaFlux`), iar cele adaugate de cenzor
 * raman neatinse.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  if (!(await poateVedeaDosarul(user, id))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    select: { id: true, luna: true, an: true, etapa: true, stareEtapa: true, _count: { select: { fisiere: true } } },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });

  // Raportul semnat s-a dat pe documentele de atunci. O recitire ar sterge
  // constatarile pe care se sprijina semnatura.
  if (dosar.etapa === "semnat") {
    return NextResponse.json(
      { error: `Dosarul pe ${dosar.luna} ${dosar.an} are raport semnat. Verificarea nu se mai poate relua.` },
      { status: 409 },
    );
  }

  if (dosar._count.fisiere === 0) {
    return NextResponse.json(
      { error: "Dosarul e gol. Încarcă documentele înainte de verificare." },
      { status: 400 },
    );
  }

  // O a doua apasare cat timp prima inca lucreaza ar porni doua citiri peste
  // acelasi dosar, care si-ar scrie una alteia peste rezultate.
  if (dosar.stareEtapa === "in_lucru") {
    return NextResponse.json(
      { error: "Verificarea acestui dosar e deja în lucru." },
      { status: 409 },
    );
  }

  await prisma.dosar.update({
    where: { id },
    data: { etapa: "intrare", stareEtapa: "in_lucru", terminatLa: null },
  });
  await prisma.evenimentFlux.create({
    data: { dosarId: id, etapa: "intrare", stare: "in_lucru", mesaj: "Verificare pornită de cenzor" },
  });

  // Raspunsul pleaca acum; citirea continua dupa el. Fisierele se aduc din
  // stocare — pe calea asta nu le avem in memorie.
  after(async () => {
    await ruleazaFlux({ dosarId: id });
  });

  return NextResponse.json({ pornit: true });
}
