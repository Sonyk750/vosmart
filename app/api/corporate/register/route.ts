import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + process.env.NEXTAUTH_SECRET).digest("hex");
}

const PACKAGE_LIMITS: Record<string, number> = {
  starter: 5, business: 15, professional: 50, enterprise: 9999
};

export async function POST(req: NextRequest) {
  try {
    const { companyName, cui, address, phone, name, email, password, package: pkg } = await req.json();
    if (!companyName || !name || !email || !password) {
      return NextResponse.json({ error: "Câmpurile obligatorii lipsesc" }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Există deja un cont cu acest email" }, { status: 409 });

    const maxAssoc = PACKAGE_LIMITS[pkg] || 5;

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashPassword(password),
        role: "corporate",
        corporateAccount: {
          create: {
            companyName,
            cui,
            address,
            phone,
            package: pkg || "starter",
            maxAssoc,
            status: "pending",
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
