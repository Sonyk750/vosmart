import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email și parola sunt obligatorii" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email sau parolă incorectă" }, { status: 401 });

    // Transparent migration: SHA-256 (64 hex chars) → bcrypt
    let passwordValid = false;
    if (user.password.length === 64) {
      // Hash vechi SHA-256 - verifica si migreaza
      const oldHash = crypto.createHash("sha256").update(password + process.env.NEXTAUTH_SECRET).digest("hex");
      if (user.password === oldHash) {
        passwordValid = true;
        // Migreaza la bcrypt
        const newHash = await bcrypt.hash(password, 12);
        await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });
      }
    } else {
      // Hash nou bcrypt
      passwordValid = await bcrypt.compare(password, user.password);
    }

    if (!passwordValid) return NextResponse.json({ error: "Email sau parolă incorectă" }, { status: 401 });

    if (user.role === "client" && user.status !== "active") {
      return NextResponse.json({ error: "Contul tau asteapta aprobarea administratorului VoSmart." }, { status: 403 });
    }
    if (user.role === "corporate" && user.status !== "active") {
      return NextResponse.json({ error: "Contul nu a fost activat. Verificați emailul pentru linkul de activare." }, { status: 403 });
    }

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
