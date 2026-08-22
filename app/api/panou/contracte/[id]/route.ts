import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";

/**
 * Un contract: citire, modificare, reziliere.
 *
 * Rezilierea NU sterge nimic. Un contract incheiat isi pastreaza dosarele si
 * rapoartele semnate — asociatia are dreptul la ele si dupa ce colaborarea se
 * termina, iar noi avem obligatia sa le putem arata. Se schimba doar starea, si
 * odata cu ea locul lui in liste si in flux.
 */

const text = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
};

const data = (v: unknown): Date | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
};

const email = (v: unknown): string | null => {
  const s = text(v, 160);
  if (!s) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s.toLowerCase() : null;
};

const STARI = ["activ", "suspendat", "incheiat"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  if (!(await poateVedeaContractul(user, id))) {
    return NextResponse.json({ error: "Contract negăsit" }, { status: 404 });
  }

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) return NextResponse.json({ error: "Contract negăsit" }, { status: 404 });

  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  if (!(await poateVedeaContractul(user, id))) {
    return NextResponse.json({ error: "Contract negăsit" }, { status: 404 });
  }

  const trup = await req.json().catch(() => ({}));
  const modificari: Record<string, unknown> = {};

  // Schimbarea de stare vine singura, dintr-un buton, nu amestecata cu restul
  // formularului: „reziliez" si „corectez telefonul" sunt doua gesturi diferite.
  if (typeof trup.status === "string") {
    if (!STARI.includes(trup.status)) {
      return NextResponse.json({ error: "Stare necunoscută." }, { status: 400 });
    }
    modificari.status = trup.status;
    // La reziliere retinem si data, daca nu era deja trecuta in contract.
    if (trup.status === "incheiat") {
      const existent = await prisma.contract.findUnique({ where: { id }, select: { dataIncetarii: true } });
      if (!existent?.dataIncetarii) modificari.dataIncetarii = data(trup.dataIncetarii) ?? new Date();
    }
  }

  if ("denumire" in trup) {
    const d = text(trup.denumire, 200);
    if (!d) return NextResponse.json({ error: "Denumirea nu poate rămâne goală." }, { status: 400 });
    modificari.denumire = d;
  }
  if ("cui" in trup) {
    const cui = typeof trup.cui === "string" ? trup.cui.replace(/\D/g, "") : "";
    if (cui.length < 2 || cui.length > 10) {
      return NextResponse.json({ error: "CUI-ul nu pare valid. Se așteaptă între 2 și 10 cifre." }, { status: 400 });
    }
    modificari.cui = cui;
  }
  if ("ziTermen" in trup) {
    const z = Number(trup.ziTermen);
    modificari.ziTermen = Number.isInteger(z) && z >= 1 && z <= 28 ? z : 15;
  }

  for (const camp of ["numar", "regCom", "adresa", "localitate", "telefon", "reprezentant", "persoanaNume", "persoanaFunctie", "persoanaTelefon", "observatii"]) {
    if (camp in trup) modificari[camp] = text(trup[camp], camp === "observatii" ? 2000 : 300);
  }
  for (const camp of ["email", "persoanaEmail"]) {
    if (camp in trup) modificari[camp] = email(trup[camp]);
  }
  for (const camp of ["dataSemnarii", "dataIncetarii"]) {
    if (camp in trup && modificari[camp] === undefined) modificari[camp] = data(trup[camp]);
  }

  if (Object.keys(modificari).length === 0) {
    return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });
  }

  const contract = await prisma.contract.update({ where: { id }, data: modificari });
  return NextResponse.json({ contract });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Doar proprietarul poate șterge un contract." }, { status: 403 });
  }

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: { denumire: true, _count: { select: { dosare: true } } },
  });
  if (!contract) return NextResponse.json({ error: "Contract negăsit" }, { status: 404 });

  // Un contract cu dosare nu se sterge din greseala: ar lua cu el documentele
  // primite si rapoartele semnate. Cine vrea sa incheie colaborarea rezilieaza.
  if (contract._count.dosare > 0) {
    return NextResponse.json({
      error: `Contractul are ${contract._count.dosare} ${contract._count.dosare === 1 ? "dosar" : "dosare"} cu documente și rapoarte. Reziliați-l în loc să-l ștergeți — datele rămân accesibile.`,
    }, { status: 409 });
  }

  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
