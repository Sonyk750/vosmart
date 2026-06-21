import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + process.env.NEXTAUTH_SECRET).digest("hex");
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "corporate") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const corp = await prisma.corporateAccount.findUnique({ where: { userId: user.id }, include: { _count: { select: { associations: true } } } });
  if (!corp) return NextResponse.json({ error: "Cont corporate negăsit" }, { status: 404 });
  if (corp._count.associations >= corp.maxAssoc) return NextResponse.json({ error: "Limita de asociații atinsă. Upgrade la un plan plătit pentru mai multe asociații." }, { status: 400 });

  const { clientName, clientEmail, clientPassword, assocName, assocCui, assocAddress, assocPhone, corporateId } = await req.json();
  if (!clientName || !clientEmail || !clientPassword || !assocName) {
    return NextResponse.json({ error: "Câmpurile obligatorii lipsesc" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: clientEmail.toLowerCase() } });

  // Dacă emailul aparține altui utilizator (nu celui corporate curent), blocăm
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Email deja folosit de un alt utilizator" }, { status: 409 });
  }

  const isTrial = corp.package === "trial";
  const assocData = {
    name: assocName,
    cui: assocCui || null,
    address: assocAddress || null,
    phone: assocPhone || null,
    corporateId: corp.id,
    maxDocuments: isTrial ? 5 : 30,
  };

  // Dacă emailul este al utilizatorului corporate curent, creăm doar asociația
  if (existing && existing.id === user.id) {
    const assoc = await prisma.association.create({
      data: { ...assocData, userId: user.id },
      include: {
        _count: { select: { documents: true, reports: true } },
        documents: { take: 3, orderBy: { createdAt: "desc" } },
        reports: { take: 3, orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ success: true, association: { ...assoc, user: { name: existing.name, email: existing.email } } });
  }

  // Email nou — creăm user client + asociație
  const newUser = await prisma.user.create({
    data: {
      name: clientName,
      email: clientEmail.toLowerCase(),
      password: hashPassword(clientPassword),
      role: "client",
      association: { create: assocData },
    },
    include: {
      association: {
        include: {
          _count: { select: { documents: true, reports: true } },
          documents: { take: 3, orderBy: { createdAt: "desc" } },
          reports: { take: 3, orderBy: { createdAt: "desc" } },
        }
      }
    }
  });

  return NextResponse.json({ success: true, association: { ...newUser.association, user: { name: newUser.name, email: newUser.email } } });
}
