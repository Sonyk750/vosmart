import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { constatariDosar } from "@/lib/cenzorat/pipeline";
import { calculeazaScor } from "@/lib/cenzorat/scor";
import { ExtrasDosar } from "@/lib/cenzorat/tipuri";

/**
 * Tot ce ii trebuie cenzorului ca sa decida asupra unui dosar.
 *
 * Inainte, ecranul cenzorului primea un titlu, un scor si o lista de siruri de
 * caractere, iar cand apasa „Draft AI" pornea o A DOUA analiza, cu alt model,
 * care nu vedea documentele — doar resturile primei. Aici cenzorul primeste
 * cifrele citite, constatarile cu probele lor si fisierele; nu se mai genereaza
 * nimic la apasare de buton.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const dosar = await prisma.dosar.findUnique({
    where: { id },
    include: {
      contract: { select: { id: true, denumire: true, cui: true, numar: true, adresa: true, telefon: true, email: true, reprezentant: true } },
      fisiere: {
        select: {
          id: true, numeFisier: true, eticheta: true, tip: true, mimeType: true,
          marime: true, marimeOriginala: true, amprenta: true,
          // Ce a citit modelul in document — filele din pupitru arata asta, nu
          // numele tipului: cinci file scriind toate „Facturi furnizori" nu ajuta
          // pe nimeni sa gaseasca factura de la Apa Nova.
          denumireAi: true, emitentAi: true, perioadaAi: true, tipSursa: true,
        },
        orderBy: { createdAt: "asc" },
      },
      reports: { where: { tip: "expert" }, select: { id: true, status: true, semnatDe: true, semnatLa: true } },
    },
  });
  if (!dosar) return NextResponse.json({ error: "Dosar negăsit" }, { status: 404 });

  if (!(await poateVedeaContractul(user, dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const constatari = await constatariDosar(id);

  return NextResponse.json({
    dosar: {
      id: dosar.id,
      titlu: dosar.titlu ?? `${dosar.luna} ${dosar.an}`,
      luna: dosar.luna, an: dosar.an,
      etapa: dosar.etapa, stareEtapa: dosar.stareEtapa,
      incredere: dosar.incredere, creatLa: dosar.createdAt, terminatLa: dosar.terminatLa,
    },
    contract: dosar.contract,
    extras: (dosar.extras as ExtrasDosar | null) ?? null,
    fisiere: dosar.fisiere,
    constatari,
    // Scorul se recalculeaza din starea de acum a constatarilor, nu se ia din
    // coloana salvata: cenzorul poate sa fi respins ceva de la ultima citire.
    scor: calculeazaScor(constatari),
    // Raportul expertului, daca exista deja unul: cand e semnat, ecranul se
    // inchide la modificari.
    raport: dosar.reports[0] ?? null,
  });
}
