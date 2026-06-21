import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/app/api/corporate/register/route";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const { email, action } = await req.json();
  if (!email) return NextResponse.json({ error: "Email obligatoriu" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { corporateAccount: true },
  });

  if (!user) return NextResponse.json({ error: "Utilizatorul nu există" }, { status: 404 });
  if (!user.corporateAccount) return NextResponse.json({ error: "Nu are cont corporate" }, { status: 404 });

  if (action === "activate") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { status: "active" } }),
      prisma.corporateAccount.update({ where: { id: user.corporateAccount.id }, data: { status: "active", activatedAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true, message: `Contul ${email} a fost activat.` });
  }

  if (action === "get_link") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vosmart.ro";
    const token = createVerificationToken(user.corporateAccount.id);
    const link = `${appUrl}/api/corporate/verify?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ success: true, link, status: user.status });
  }

  if (action === "delete") {
    await prisma.corporateAccount.delete({ where: { id: user.corporateAccount.id } });
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ success: true, message: `Contul ${email} a fost șters.` });
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
}
