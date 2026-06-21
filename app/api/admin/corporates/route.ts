import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const corporates = await prisma.user.findMany({
    where: { role: "corporate" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, status: true, createdAt: true,
      corporateAccount: {
        select: {
          id: true, companyName: true, package: true, status: true,
          subscriptionStatus: true, maxAssoc: true, currentPeriodEnd: true,
          _count: { select: { associations: true } },
          associations: {
            select: {
              id: true,
              filesUploadedCount: true,
              _count: { select: { documents: true, reports: true } },
            },
          },
        },
      },
    },
  });

  // Agregăm tokeni pentru costul AI per client
  const assocIds = corporates.flatMap(c =>
    c.corporateAccount?.associations.map(a => a.id) ?? []
  );

  const tokenAgg = await prisma.document.groupBy({
    by: ["associationId"],
    where: { associationId: { in: assocIds } },
    _sum: { aiTokensIn: true, aiTokensOut: true },
  });

  const tokenMap = Object.fromEntries(
    tokenAgg.map(r => [r.associationId, {
      tokensIn: r._sum.aiTokensIn ?? 0,
      tokensOut: r._sum.aiTokensOut ?? 0,
    }])
  );

  const result = corporates.map(corp => {
    const assocs = corp.corporateAccount?.associations ?? [];
    const totalReports = assocs.reduce((s, a) => s + (a._count.reports ?? 0), 0);
    const totalDocs = assocs.reduce((s, a) => s + (a._count.documents ?? 0), 0);
    // Haiku: $0.80/1M input, $4/1M output → în RON (×4.7)
    const totalCostRon = assocs.reduce((s, a) => {
      const t = tokenMap[a.id];
      if (!t) return s;
      return s + (t.tokensIn * 0.80 / 1_000_000 + t.tokensOut * 4.00 / 1_000_000) * 4.7;
    }, 0);
    return {
      ...corp,
      corporateAccount: corp.corporateAccount ? {
        ...corp.corporateAccount,
        associations: assocs,
        totalReports,
        totalDocs,
        totalCostRon: Math.round(totalCostRon * 100) / 100,
      } : null,
    };
  });

  return NextResponse.json(result);
}
