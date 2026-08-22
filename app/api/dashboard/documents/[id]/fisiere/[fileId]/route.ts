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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id, fileId } = await params;

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

  // `attachment`, nu `inline`: chiar daca ar ajunge vreodata un fisier cu
  // continut activ pana aici, browserul il salveaza, nu il executa.
  const numeCurat = fisier.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");

  return new NextResponse(continut.stream, {
    headers: {
      "Content-Type": continut.mimeType,
      "Content-Disposition": `attachment; filename="${numeCurat}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
