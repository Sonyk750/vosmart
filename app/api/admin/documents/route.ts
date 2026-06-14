import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const whereClause = user.role === "cenzor"
    ? { association: { allocations: { some: { cenzorId: user.id } } } }
    : {};

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: { association: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
