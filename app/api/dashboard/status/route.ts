import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId, associationId: user.association.id },
      select: { id: true, status: true, aiScore: true, title: true }
    });
    return NextResponse.json(doc || { error: "negăsit" });
  }

  // Returnează toate documentele în curs de analiză
  const analyzing = await prisma.document.findMany({
    where: {
      associationId: user.association.id,
      status: { in: ["analyzing", "analyzed", "error"] }
    },
    select: { id: true, status: true, aiScore: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json(analyzing);
}
