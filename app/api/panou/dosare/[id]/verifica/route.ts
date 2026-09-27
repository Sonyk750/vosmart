import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaDosarul } from "@/lib/acces";
import { ruleazaFlux } from "@/lib/cenzorat/pipeline";
import { areRaportSemnat, IN_LUCRU_EXPIRA_MS } from "@/lib/cenzorat/blocare";
import { lipsuri } from "@/lib/cenzorat/documente";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  if (!(await poateVedeaDosarul(user, id))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    select: { id: true, luna: true, an: true, fisiere: { select: { tip: true } }, _count: { select: { fisiere: true } } },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });

  // Raportul semnat s-a dat pe documentele de atunci. O recitire ar sterge
  // constatarile pe care se sprijina semnatura.
  if (await areRaportSemnat(id)) {
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

  // Dosar incomplet: nu se refuza, dar nici nu se porneste pe tacute. Omul vede
  // ce lipseste si confirma; verificarea va marca zonele respective neverificate.
  const trup = await req.json().catch(() => ({}));
  const lipsa = lipsuri(dosar.fisiere.map(f => f.tip));
  if (lipsa.length > 0 && trup?.confirmIncomplet !== true) {
    return NextResponse.json({ error: `Din dosar lipsesc: ${lipsa.join(", ")}.`, lipsa }, { status: 409 });
  }

  // O a doua apasare cat timp prima inca lucreaza ar porni doua citiri peste
  // acelasi dosar, care si-ar scrie una alteia peste rezultate. Luarea dosarului
  // se face intr-un singur pas conditionat: din doua cereri simultane, doar una
  // gaseste dosarul liber.
  //
  // „In lucru" fara semn de viata de 10 minute inseamna o analiza oprita de
  // platforma la limita de timp; ea nu mai tine dosarul ocupat (vezi blocare.ts).
  const prag = new Date(Date.now() - IN_LUCRU_EXPIRA_MS);
  const luat = await prisma.dosar.updateMany({
    where: {
      id,
      OR: [{ stareEtapa: { not: "in_lucru" } }, { updatedAt: { lt: prag } }],
      NOT: { reports: { some: { tip: "expert", status: "publicat" } } },
    },
    data: { etapa: "intrare", stareEtapa: "in_lucru", terminatLa: null },
  });
  if (luat.count === 0) {
    return NextResponse.json(
      { error: "Verificarea acestui dosar e deja în lucru." },
      { status: 409 },
    );
  }
  await prisma.evenimentFlux.create({
    data: { dosarId: id, etapa: "intrare", stare: "in_lucru", mesaj: "Verificare pornită de cenzor", autorId: user.id },
  });

  // Raspunsul pleaca acum; citirea continua dupa el. Fisierele se aduc din
  // stocare — pe calea asta nu le avem in memorie.
  after(async () => {
    await ruleazaFlux({ dosarId: id });
  });

  return NextResponse.json({ pornit: true });
}
