import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ștergere definitivă a unui client corporate (din panoul de admin).
// [id] = id-ul User-ului corporate (corp.id din lista de clienți).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      corporateAccount: { select: { id: true, companyName: true } },
    },
  });

  if (!user || user.role !== "corporate")
    return NextResponse.json({ error: "Client corporate negăsit" }, { status: 404 });

  // Strângem toate asociațiile clientului: cele legate prin contul corporate (corporateId)
  // și asociația proprie a userului (userId). Acoperim ambele ca să nu rămână orfani.
  const assocs = await prisma.association.findMany({
    where: {
      OR: [
        ...(user.corporateAccount ? [{ corporateId: user.corporateAccount.id }] : []),
        { userId: user.id },
      ],
    },
    select: { id: true },
  });
  const assocIds = assocs.map(a => a.id);

  // Ștergem explicit, de la copii spre părinți, fără să ne bazăm pe cascade-ul DB.
  // Totul într-o singură tranzacție (forma cu array — suportată de adapterul Neon).
  await prisma.$transaction([
    prisma.document.deleteMany({ where: { associationId: { in: assocIds } } }),
    prisma.report.deleteMany({ where: { associationId: { in: assocIds } } }),
    prisma.documentAddonPurchase.deleteMany({ where: { associationId: { in: assocIds } } }),
    prisma.cenzorAllocation.deleteMany({ where: { associationId: { in: assocIds } } }),
    prisma.association.deleteMany({ where: { id: { in: assocIds } } }),
    ...(user.corporateAccount ? [prisma.corporateAccount.delete({ where: { id: user.corporateAccount.id } })] : []),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Client „${user.corporateAccount?.companyName ?? ""}" șters definitiv`,
  });
}
