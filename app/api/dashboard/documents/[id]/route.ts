import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { associationId: true, association: { select: { userId: true } } },
  });

  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });
  if (doc.association?.userId !== user.id && user.role !== "admin")
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
