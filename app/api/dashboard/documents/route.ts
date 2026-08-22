import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: { associationId: user.association.id },
    orderBy: { createdAt: "desc" },
    // Fisierele vin doar cu numele si id-ul. Adresa din Blob NU pleaca spre
    // browser: descarcarea trece prin ruta care verifica a cui e dosarul.
    include: {
      files: {
        select: { id: true, fileName: true, label: true, type: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json(documents);
}
