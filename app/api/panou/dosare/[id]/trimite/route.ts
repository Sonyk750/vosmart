import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { raportSemnatPentruIesire } from "@/lib/cenzorat/raport-semnat";
import { trimiteRaportSemnat } from "@/lib/email";
import { VERDICTE, type Verdict } from "@/lib/cenzorat/scor";

/**
 * Trimiterea raportului semnat catre asociatie si administrator.
 *
 * Pas separat de semnare, facut de om: cenzorul vede destinatarii si adresele
 * lor si apasa el. Nimic nu pleaca automat. Fiecare trimitere se scrie in
 * `TrimitereRaport` cu rezultatul ei — si cea reusita, si cea esuata.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const CATRE = ["asociatie", "administrator", "persoana"] as const;
type Catre = (typeof CATRE)[number];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  const dosar = await prisma.dosar.findUnique({ where: { id }, select: { contractId: true } });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });
  if (!(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const trup = await req.json().catch(() => ({}));
  const alese: Catre[] = Array.isArray(trup.catre) ? trup.catre.filter((c: unknown): c is Catre => CATRE.includes(c as Catre)) : [];
  if (alese.length === 0) return NextResponse.json({ error: "Alege cui trimiți raportul." }, { status: 400 });

  const r = await raportSemnatPentruIesire(id);
  if ("eroare" in r) return NextResponse.json({ error: r.eroare }, { status: r.cod });

  const ct = r.raport.contract;
  const adrese: Record<Catre, { email: string | null; nume: string | null }> = {
    asociatie: { email: ct.email, nume: ct.reprezentant },
    administrator: { email: ct.administratorEmail, nume: ct.administratorNume },
    persoana: { email: ct.persoanaEmail, nume: ct.persoanaNume },
  };

  // Aceeasi adresa aleasa sub doua roluri primeste un singur email.
  const trimise = new Set<string>();
  const rezultate: { catre: Catre; email: string | null; stare: "trimis" | "esuat" | "fara_adresa"; eroare?: string }[] = [];
  const verdict = VERDICTE[(r.date.scor?.verdict ?? "observatii") as Verdict]?.eticheta ?? "";

  for (const catre of alese) {
    const { email, nume } = adrese[catre];
    if (!email) { rezultate.push({ catre, email: null, stare: "fara_adresa" }); continue; }
    if (trimise.has(email)) continue;
    trimise.add(email);
    let stare: "trimis" | "esuat" = "trimis";
    let eroare: string | null = null;
    try {
      await trimiteRaportSemnat({
        to: email, numeDestinatar: nume, asociatie: ct.denumire,
        luna: r.raport.dosar.luna, an: r.raport.dosar.an,
        bunDePlata: Boolean(r.raport.bunDePlata), verdict,
        semnatar: r.raport.semnatDe ?? "", amprenta: r.amprenta,
        pdf: r.pdf, numeFisier: r.numeFisier,
      });
    } catch (e) {
      stare = "esuat";
      eroare = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    }
    await prisma.trimitereRaport.create({
      data: { reportId: r.raport.id, catre, email, stare, eroare, trimisDe: user.name || user.email },
    });
    rezultate.push({ catre, email, stare, ...(eroare ? { eroare } : {}) });
  }

  const reusite = rezultate.filter(x => x.stare === "trimis");
  if (reusite.length > 0) {
    await prisma.evenimentFlux.create({
      data: {
        dosarId: id, etapa: "semnat", stare: "gata", autorId: user.id,
        mesaj: `Raport trimis către ${reusite.map(x => `${x.catre} (${x.email})`).join(", ")} de ${user.name || user.email}`,
      },
    });
  }

  return NextResponse.json({ rezultate });
}
