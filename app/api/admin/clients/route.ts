import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const whereClause = user.role === "cenzor"
    ? { allocations: { some: { cenzorId: user.id } } }
    : {};

  const associations = await prisma.association.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true, status: true } },
      documents: { orderBy: { createdAt: "desc" }, take: 5 },
      reports: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { documents: true, reports: true } },
      corporate: { select: { package: true, companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(associations);
}
