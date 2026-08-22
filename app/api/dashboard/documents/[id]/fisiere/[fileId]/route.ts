import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
import { citesteFisier } from "@/lib/stocare";

export const runtime = "nodejs";

/**
 * Singura usa prin care iese un document incarcat.
 *
 * Fisierele stau intr-un store PRIVAT, deci adresa lor nu deschide nimic fara
 * token — iar tokenul nu pleaca niciodata de pe server. Cine vrea fisierul trece
 * pe aici, iar aici se intreaba intai a cui e dosarul.
 *
 * Se cere si id-ul documentului, nu doar al fisierului: asa nu se poate lipi un
 * fileId strain sub un document propriu ca sa treaca de verificare.
 */
/**
 * Tipurile care pot fi aratate DESCHIS in pagina, fara sa fie salvate intai.
 * Cenzorul trebuie sa vada lista de plata langa constatare, altfel decide pe
 * baza unui rezumat. Lista e restransa dinadins la formate pasive.
 */
const MIME_INLINE = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id, fileId } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const fisier = await prisma.documentFile.findFirst({
    where: { id: fileId, documentId: id },
    select: {
      fileName: true,
      mimeType: true,
      blobUrl: true,
      document: { select: { associationId: true } },
    },
  });
  if (!fisier) return NextResponse.json({ error: "Fișier negăsit" }, { status: 404 });

  if (!(await poateVedeaAsociatia(user, fisier.document.associationId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  const continut = await citesteFisier(fisier.blobUrl);
  if (!continut) {
    return NextResponse.json({ error: "Fișierul nu mai este disponibil" }, { status: 404 });
  }

  const numeCurat = fisier.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");

  // Implicit `attachment`, nu `inline`: chiar daca ar ajunge vreodata un fisier
  // cu continut activ pana aici, browserul il salveaza, nu il executa.
  //
  // `?inline=1` deschide fisierul in pagina, dar numai daca e un format pasiv
  // (PDF sau imagine) — de asta are nevoie pupitrul cenzorului, ca sa se uite in
  // document in timp ce decide. Chiar si atunci punem `sandbox` in CSP, deci
  // documentul ruleaza fara scripturi, fara formulare si fara acces la originea
  // aplicatiei; un PDF cu JavaScript in el ramane o foaie de hartie.
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
