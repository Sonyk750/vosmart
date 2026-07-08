import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId lipsă" }, { status: 400 });

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      ...(user.role === "cenzor"
        ? { association: { allocations: { some: { cenzorId: user.id } } } }
        : {}),
    },
    include: { association: true },
  });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  // Cautăm raportul draft pentru această asociație și perioadă
  const report = await prisma.report.findFirst({
    where: {
      associationId: doc.associationId,
      status: "draft",
      month: doc.month || undefined,
      year: doc.year || undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ draft: report?.aiDraft || null, reportId: report?.id || null });
}
