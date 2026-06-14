import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { associationId } = await req.json();
  if (!associationId) return NextResponse.json({ error: "associationId lipsa" }, { status: 400 });

  const association = await prisma.association.findUnique({
    where: { id: associationId },
    select: { userId: true },
  });

  if (!association) return NextResponse.json({ error: "Client negasit" }, { status: 404 });

  await prisma.user.update({
    where: { id: association.userId },
    data: { status: "active" },
  });

  return NextResponse.json({ success: true });
}
