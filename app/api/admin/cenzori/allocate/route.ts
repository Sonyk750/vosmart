import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { cenzorId, associationId } = await req.json();
  await prisma.cenzorAllocation.upsert({
    where: { cenzorId_associationId: { cenzorId, associationId } },
    update: {},
    create: { cenzorId, associationId },
  });

  return NextResponse.json({ success: true });
}
