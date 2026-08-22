import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Lista dosarelor clientului, pe pagini.
 *
 * Inainte ruta intorcea TOATE dosarele, cu toate fisierele lor, iar panoul o
 * chema din nou la fiecare 8 secunde cat timp exista ceva in analiza. La zece
 * luni de dosare inseamna zeci de randuri si sute de fisiere transportate
 * degeaba, la fiecare 8 secunde, ca sa se schimbe o bara de progres.
 */

const PE_PAGINA_IMPLICIT = 8;
const PE_PAGINA_MAXIM = 50;

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const cauta = new URL(req.url).searchParams;
  const pagina = Math.max(1, parseInt(cauta.get("pagina") ?? "1", 10) || 1);
  const pePagina = Math.min(PE_PAGINA_MAXIM, Math.max(1, parseInt(cauta.get("pePagina") ?? String(PE_PAGINA_IMPLICIT), 10) || PE_PAGINA_IMPLICIT));

  const unde = { associationId: user.association.id };

  const [total, randuri] = await Promise.all([
    prisma.document.count({ where: unde }),
    prisma.document.findMany({
      where: unde,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * pePagina,
      take: pePagina,
      select: {
        id: true, title: true, month: true, year: true, status: true,
        etapa: true, stareEtapa: true, aiScore: true, verdict: true,
        incredere: true, aiSummary: true, createdAt: true, terminatLa: true,
        // Adresa din Blob NU pleaca spre browser: descarcarea trece prin ruta
        // care verifica intai a cui e dosarul.
        files: {
          select: { id: true, fileName: true, label: true, type: true, size: true },
          orderBy: { createdAt: "asc" },
        },
        constatari: { select: { severitate: true, stare: true } },
        evenimente: { orderBy: { createdAt: "desc" }, take: 1, select: { mesaj: true, etapa: true, stare: true, createdAt: true } },
      },
    }),
  ]);

  const dosare = randuri.map(d => {
    const active = d.constatari.filter(c => c.stare !== "respinsa");
    return {
      id: d.id,
      titlu: d.title,
      luna: d.month,
      an: d.year,
      status: d.status,
      etapa: d.etapa,
      stareEtapa: d.stareEtapa,
      scor: d.aiScore,
      verdict: d.verdict,
      incredere: d.incredere,
      rezumat: d.aiSummary,
      creatLa: d.createdAt,
      terminatLa: d.terminatLa,
      fisiere: d.files,
      constatari: {
        total: active.length,
        critice: active.filter(c => c.severitate === "critica").length,
        ridicate: active.filter(c => c.severitate === "ridicata").length,
      },
      ultimulPas: d.evenimente[0] ?? null,
    };
  });

  return NextResponse.json({
    dosare,
    total,
    pagina,
    pePagina,
    pagini: Math.max(1, Math.ceil(total / pePagina)),
  });
}
