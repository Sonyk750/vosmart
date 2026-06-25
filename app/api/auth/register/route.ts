import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdminForClientApproval } from "@/lib/email";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, associationName, cui, address, phone, package: pkg } = await req.json();

    if (!name || !email || !password || !associationName) {
      return NextResponse.json({ error: "Toate câmpurile obligatorii trebuie completate" }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Există deja un cont cu acest email" }, { status: 409 });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name, email: email.toLowerCase(), password: hashed, status: "pending",
        association: {
          create: { name: associationName, cui, address, phone, package: pkg || "smart" }
        }
      }
    });

    try {
      await notifyAdminForClientApproval({
        name,
        email: email.toLowerCase(),
        associationName,
        cui,
        address,
        phone,
        packageName: pkg || "smart",
      });
      console.log("Email aprobare client trimis catre administrator:", email.toLowerCase());
    } catch (emailError) {
      console.error("Eroare email aprobare client:", emailError);
    }

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message: "Contul a fost creat si asteapta aprobarea administratorului.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
