import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const reports = await prisma.report.findMany({
    where: { associationId: user.association.id },
    include: { association: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reports);
}
