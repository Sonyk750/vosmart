import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const cenzori = await prisma.user.findMany({
    where: { role: "cenzor" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      allocatedClients: { include: { association: { select: { name: true } } } }
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cenzori);
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { name, email, password } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "Toate câmpurile sunt obligatorii" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email deja folosit" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const cenzor = await prisma.user.create({
    data: { name, email: email.toLowerCase(), password: hashed, role: "cenzor" }
  });

  return NextResponse.json({ success: true, id: cenzor.id });
}
