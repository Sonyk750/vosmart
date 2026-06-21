import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + process.env.NEXTAUTH_SECRET).digest("hex");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { companyName, email, password, packageType, phone } = await req.json();
  if (!companyName || !email || !password) return NextResponse.json({ error: "Date lipsă" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email deja folosit" }, { status: 409 });

  const PACKAGE_LIMITS: Record<string, number> = { trial: 1, starter: 10, business: 25, professional: 50, enterprise: 9999 };
  const maxAssoc = PACKAGE_LIMITS[packageType] ?? 1;

  const newUser = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hashPassword(password), role: "corporate", status: "active", name: companyName },
  });

  const corp = await prisma.corporateAccount.create({
    data: { userId: newUser.id, companyName, package: packageType || "trial", status: "active", maxAssoc, activatedAt: new Date(), ...(phone ? { phone } : {}) },
  });

  await prisma.association.create({
    data: { userId: newUser.id, corporateId: corp.id, name: companyName, package: "trial", maxDocuments: 5 },
  });

  return NextResponse.json({ success: true, message: `Cont creat pentru ${email}` });
}
