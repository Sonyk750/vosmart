import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "corporate") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { documentId, draft, associationId } = await req.json();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  const now = new Date();
  await prisma.report.create({
    data: {
      associationId,
      title: `Raport cenzor — ${doc.title}`,
      month: now.toLocaleString("ro-RO", { month: "long" }),
      year: now.getFullYear(),
      aiDraft: draft,
      status: "published",
      approvedBy: user.id,
      approvedAt: now,
    },
  });

  return NextResponse.json({ success: true });
}
