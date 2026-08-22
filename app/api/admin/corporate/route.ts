import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const accounts = await prisma.corporateAccount.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { associations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function PATCH(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id, status } = await req.json();

  // Statusul venea direct din body, deci se putea scrie orice sir in coloana.
  const STARI = { pending: "pending", active: "active", suspended: "rejected" } as const;
  if (!(status in STARI)) {
    return NextResponse.json({ error: "Status invalid" }, { status: 400 });
  }

  const updated = await prisma.corporateAccount.update({
    where: { id },
    data: {
      status,
      activatedAt: status === "active" ? new Date() : undefined,
    },
  });

  // Contul firmei si omul care intra pe el merg impreuna: altfel suspendarea
  // firmei lasa utilizatorul sa se logheze mai departe, cu panoul lui cu tot.
  const statusUser = STARI[status as keyof typeof STARI];
  await prisma.user.update({ where: { id: updated.userId }, data: { status: statusUser } });
  if (statusUser !== "active") {
    await prisma.session.deleteMany({ where: { userId: updated.userId } });
  }

  return NextResponse.json({ success: true, account: updated });
}
