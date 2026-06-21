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
              _count: { select: { documents: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  return NextResponse.json(corporates);
}
