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

  const PACKAGE_LIMITS: Record<string, { maxAssoc: number; maxDosare: number }> = {
    trial:        { maxAssoc: 1,    maxDosare: 1    },
    starter:      { maxAssoc: 10,   maxDosare: 10   },
    business:     { maxAssoc: 25,   maxDosare: 25   },
    professional: { maxAssoc: 50,   maxDosare: 50   },
    enterprise:   { maxAssoc: 9999, maxDosare: 9999 },
  };
  const limits = PACKAGE_LIMITS[packageType] ?? PACKAGE_LIMITS.trial;
  const maxAssoc = limits.maxAssoc;

  const newUser = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hashPassword(password), role: "corporate", status: "active", name: companyName },
  });

  const corp = await prisma.corporateAccount.create({
    data: { userId: newUser.id, companyName, package: packageType || "trial", status: "active", maxAssoc, activatedAt: new Date(), ...(phone ? { phone } : {}) },
  });

  await prisma.association.create({
    data: { userId: newUser.id, corporateId: corp.id, name: companyName, package: "trial", maxDocuments: limits.maxDosare },
  });

  return NextResponse.json({ success: true, message: `Cont creat pentru ${email}` });
}
