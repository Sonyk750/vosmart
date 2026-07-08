import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { documentId, draft } = await req.json();

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      ...(user.role === "cenzor"
        ? { association: { allocations: { some: { cenzorId: user.id } } } }
        : {}),
    },
  });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  const now = new Date();
  const month = now.toLocaleString("ro-RO", { month: "long" });
  const year = now.getFullYear();

  const report = await prisma.report.create({
    data: {
      associationId: doc.associationId,
      title: `Raport cenzor — ${doc.title}`,
      month,
      year,
      aiDraft: draft,
      status: "published",
      approvedBy: user.id,
      approvedAt: now,
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "analyzed" },
  });

  return NextResponse.json({ success: true, reportId: report.id });
}
