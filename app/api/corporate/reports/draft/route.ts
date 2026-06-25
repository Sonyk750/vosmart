import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "corporate") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ draft: null });

  // IDOR fix: verifica ca documentul apartine unei asociatii a contului corporate curent
  const corporateAccount = await prisma.corporateAccount.findUnique({ where: { userId: user.id } });
  if (!corporateAccount) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      association: { corporateId: corporateAccount.id },
    },
  });
  if (!doc) return NextResponse.json({ draft: null });

  const report = await prisma.report.findFirst({
    where: { associationId: doc.associationId, status: "draft" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ draft: report?.aiDraft || null });
}
