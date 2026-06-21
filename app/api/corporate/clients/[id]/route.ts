import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAssocAndVerify(id: string) {
  const user = await getSession();
  if (!user || (user.role !== "corporate" && user.role !== "admin")) return null;

  const assoc = await prisma.association.findUnique({
    where: { id },
    include: { corporate: true },
  });
  if (!assoc) return null;

  // Verificăm că asociația aparține contului corporate al userului curent
  if (user.role !== "admin") {
    const corp = await prisma.corporateAccount.findUnique({ where: { userId: user.id } });
    if (!corp || assoc.corporateId !== corp.id) return null;
  }

  return assoc;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assoc = await getAssocAndVerify(id);
  if (!assoc) return NextResponse.json({ error: "Neautorizat sau negăsit" }, { status: 403 });

  const { action } = await req.json();

  if (action === "reset_docs") {
    await prisma.association.update({
      where: { id },
      data: { filesUploadedCount: 0 },
    });
    await prisma.document.deleteMany({ where: { associationId: id, status: "error" } });
    return NextResponse.json({ success: true });
  }

  if (action === "suspend") {
    await prisma.user.update({ where: { id: assoc.userId }, data: { status: "rejected" } });
    return NextResponse.json({ success: true });
  }

  if (action === "activate") {
    await prisma.user.update({ where: { id: assoc.userId }, data: { status: "active" } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assoc = await getAssocAndVerify(id);
  if (!assoc) return NextResponse.json({ error: "Neautorizat sau negăsit" }, { status: 403 });

  // Ștergem documentele, rapoartele și asociația
  await prisma.document.deleteMany({ where: { associationId: id } });
  await prisma.report.deleteMany({ where: { associationId: id } });
  await prisma.association.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
