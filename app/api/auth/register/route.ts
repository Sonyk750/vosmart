import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.NEXTAUTH_SECRET).digest("hex");
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

    const hashed = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name, email: email.toLowerCase(), password: hashed,
        association: {
          create: { name: associationName, cui, address, phone, package: pkg || "smart" }
        }
      }
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

    const response = NextResponse.json({ success: true });
    response.cookies.set("vosmart_session", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", expires: expiresAt, path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
