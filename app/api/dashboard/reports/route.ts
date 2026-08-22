import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Rapoartele asociatiei, pe pagini.
 *
 * Continutul raportului NU vine in lista. Un raport structurat are in el tot
 * dosarul — cifre, constatari, probe — si nu are ce cauta intr-un raspuns cerut
 * din 8 in 8 secunde. Se aduce cand omul deschide raportul.
 */

const PE_PAGINA = 6;

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const cauta = new URL(req.url).searchParams;
  const pagina = Math.max(1, parseInt(cauta.get("pagina") ?? "1", 10) || 1);
  const pePagina = Math.min(30, Math.max(1, parseInt(cauta.get("pePagina") ?? String(PE_PAGINA), 10) || PE_PAGINA));

  // Clientul vede doar rapoartele SEMNATE. Un proiect nerevizuit inca poate
  // contine o constatare pe care cenzorul o va respinge; daca ajunge la
  // asociatie inainte de asta, VoSmart a acuzat pe cineva degeaba.
  const unde = { associationId: user.association.id, status: "published" };

  const [total, randuri] = await Promise.all([
    prisma.report.count({ where: unde }),
    prisma.report.findMany({
      where: unde,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * pePagina,
      take: pePagina,
      select: {
        id: true, title: true, month: true, year: true, status: true,
        createdAt: true, semnatDe: true, semnatLa: true, documentId: true,
        association: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    rapoarte: randuri.map(r => ({
      id: r.id,
      titlu: r.title,
      luna: r.month,
      an: r.year,
      status: r.status,
      creatLa: r.createdAt,
      semnatDe: r.semnatDe,
      semnatLa: r.semnatLa,
      dosarId: r.documentId,
      asociatie: r.association?.name ?? null,
    })),
    total,
    pagina,
    pePagina,
    pagini: Math.max(1, Math.ceil(total / pePagina)),
  });
}
