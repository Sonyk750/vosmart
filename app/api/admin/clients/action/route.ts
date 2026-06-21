import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { associationId, action, maxDocuments } = await req.json();
  if (!associationId || !action) return NextResponse.json({ error: "Date lipsă" }, { status: 400 });

  const assoc = await prisma.association.findUnique({
    where: { id: associationId },
    include: { user: true },
  });
  if (!assoc) return NextResponse.json({ error: "Negăsit" }, { status: 404 });

  if (action === "reset_docs") {
    await prisma.association.update({ where: { id: associationId }, data: { filesUploadedCount: 0 } });
    await prisma.document.deleteMany({ where: { associationId, status: "error" } });
    return NextResponse.json({ success: true, message: "Contor resetat" });
  }

  if (action === "suspend") {
    await prisma.user.update({ where: { id: assoc.userId }, data: { status: "rejected" } });
    return NextResponse.json({ success: true, message: "Cont suspendat" });
  }

  if (action === "activate") {
    await prisma.user.update({ where: { id: assoc.userId }, data: { status: "active" } });
    return NextResponse.json({ success: true, message: "Cont activat" });
  }

  if (action === "set_max_docs" && maxDocuments) {
    await prisma.association.update({ where: { id: associationId }, data: { maxDocuments } });
    return NextResponse.json({ success: true, message: `Limită setată la ${maxDocuments} documente` });
  }

  if (action === "delete") {
    await prisma.document.deleteMany({ where: { associationId } });
    await prisma.report.deleteMany({ where: { associationId } });
    await prisma.association.delete({ where: { id: associationId } });
    return NextResponse.json({ success: true, message: "Client șters" });
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
}
