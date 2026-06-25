import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "corporate") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { documentId, draft, associationId } = await req.json();

  // IDOR fix: verifica ca documentul apartine contului corporate curent
  const corporateAccount = await prisma.corporateAccount.findUnique({ where: { userId: user.id } });
  if (!corporateAccount) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      association: { corporateId: corporateAccount.id },
    },
  });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  // Trial limit: max 1 published report across all associations
  const corp = corporateAccount;
  if (corp?.package === "trial") {
    const assocIds = (await prisma.association.findMany({ where: { corporateId: corp.id }, select: { id: true } })).map(a => a.id);
    const reportCount = await prisma.report.count({ where: { associationId: { in: assocIds }, status: "published" } });
    if (reportCount >= 1) {
      return NextResponse.json({ error: "TRIAL_LIMIT", message: "Limita trial atinsă. Alege un pachet plătit pentru a emite mai multe rapoarte." }, { status: 403 });
    }
  }

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
