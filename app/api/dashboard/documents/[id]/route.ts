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

  // Decrementăm contorul de dosare la ștergere, dar NICIODATĂ sub zero:
  // `updateMany` cu pragul în `where` face scăderea și verificarea într-o
  // singură operație, deci două ștergeri simultane nu se pot strecura amândouă.
  // Un contor negativ ar însemna cotă infinită — verificarea din upload compară
  // `filesUploadedCount >= maxDocuments` și n-ar mai fi adevărată niciodată.
  if (doc.associationId) {
    await prisma.association.updateMany({
      where: { id: doc.associationId, filesUploadedCount: { gt: 0 } },
      data: { filesUploadedCount: { decrement: 1 } },
    });
  }

  return NextResponse.json({ success: true });
}
