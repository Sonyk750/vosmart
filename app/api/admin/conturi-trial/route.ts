import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const accounts = await prisma.user.findMany({
    where: { role: "corporate", corporateAccount: { package: "trial" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, status: true, createdAt: true,
      corporateAccount: {
        select: { id: true, companyName: true, package: true, status: true, phone: true },
      },
    },
  });

  return NextResponse.json(accounts);
}
