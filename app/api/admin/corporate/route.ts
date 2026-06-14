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
  const updated = await prisma.corporateAccount.update({
    where: { id },
    data: {
      status,
      activatedAt: status === "active" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, account: updated });
}
