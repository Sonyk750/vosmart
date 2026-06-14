import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.NEXTAUTH_SECRET).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email și parola sunt obligatorii" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email sau parolă incorectă" }, { status: 401 });

    const hashed = hashPassword(password);
    if (user.password !== hashed) return NextResponse.json({ error: "Email sau parolă incorectă" }, { status: 401 });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 zile

    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

    const response = NextResponse.json({ success: true, role: user.role });
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
