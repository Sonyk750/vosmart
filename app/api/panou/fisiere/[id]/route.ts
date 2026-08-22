import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { citesteFisier } from "@/lib/stocare";

export const runtime = "nodejs";

/**
 * Singura usa prin care iese un document din dosar.
 *
 * Fisierele stau intr-un store PRIVAT, deci adresa lor nu deschide nimic fara
 * token — iar tokenul nu pleaca niciodata de pe server. Cine vrea fisierul trece
 * pe aici, iar aici se intreaba intai al cui e contractul.
 */

/**
 * Tipurile care pot fi aratate DESCHIS in pagina, fara sa fie salvate intai.
 * Cenzorul trebuie sa vada lista de plata langa constatare, altfel decide pe
 * baza unui rezumat. Lista e restransa dinadins la formate pasive.
 */
const MIME_INLINE = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const fisier = await prisma.fisier.findUnique({
    where: { id },
    select: {
      numeFisier: true,
      mimeType: true,
      blobUrl: true,
      dosar: { select: { contractId: true } },
    },
  });
  if (!fisier) return NextResponse.json({ error: "Fișier negăsit" }, { status: 404 });

  if (!(await poateVedeaContractul(user, fisier.dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const continut = await citesteFisier(fisier.blobUrl);
  if (!continut) {
    return NextResponse.json({ error: "Fișierul nu mai este disponibil" }, { status: 404 });
  }

  const numeCurat = fisier.numeFisier.replace(/[^a-zA-Z0-9._ -]/g, "_");

  // Implicit `attachment`, nu `inline`: chiar daca ar ajunge vreodata un fisier
  // cu continut activ pana aici, browserul il salveaza, nu il executa.
  //
  // `?inline=1` il deschide in pagina, dar numai daca e un format pasiv. Chiar
  // si atunci punem `sandbox` in CSP, deci documentul ruleaza fara scripturi si
  // fara acces la originea aplicatiei; un PDF cu JavaScript in el ramane o foaie.
  const potInline = inline && MIME_INLINE.includes(continut.mimeType);

  return new NextResponse(continut.stream, {
    headers: {
      "Content-Type": continut.mimeType,
      "Content-Disposition": `${potInline ? "inline" : "attachment"}; filename="${numeCurat}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(potInline
        ? { "Content-Security-Policy": "sandbox; default-src 'none'; object-src 'none'; script-src 'none'" }
        : {}),
    },
  });
}
