import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { citesteFisier, stergeFisiere } from "@/lib/stocare";
import { numeDupaMime } from "@/lib/cenzorat/optimizare";

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

  // Tipul care conteaza e cel din baza, nu cel intors de stocare: el descrie
  // octetii pe care ii avem noi. Iar numele isi ia extensia dupa el — o scanare
  // trimisa ca „lista.png" si pastrata recodata ca JPEG trebuie sa iasa
  // „lista.jpg", altfel primul program care o deschide se plange.
  const mimeType = fisier.mimeType || continut.mimeType;
  const numeCurat = numeDupaMime(fisier.numeFisier, mimeType).replace(/[^a-zA-Z0-9._ -]/g, "_");

  // Implicit `attachment`, nu `inline`: chiar daca ar ajunge vreodata un fisier
  // cu continut activ pana aici, browserul il salveaza, nu il executa.
  //
  // `?inline=1` il deschide in pagina, dar numai daca e un format pasiv. Chiar
  // si atunci punem `sandbox` in CSP, deci documentul ruleaza fara scripturi si
  // fara acces la originea aplicatiei; un PDF cu JavaScript in el ramane o foaie.
  const potInline = inline && MIME_INLINE.includes(mimeType);

  return new NextResponse(continut.stream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${potInline ? "inline" : "attachment"}; filename="${numeCurat}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Documentul deschis in pagina nu are voie sa ceara nimic din afara si nu
      // ruleaza scripturi. `sandbox` a fost scos dinadins: in unele browsere
      // impiedica vizualizatorul intern de PDF sa porneasca, si atunci cenzorul
      // se uita la o foaie alba. `frame-ancestors 'self'` tine incadrarea la noi.
      ...(potInline
        ? { "Content-Security-Policy": "default-src 'none'; script-src 'none'; object-src 'none'; frame-ancestors 'self'" }
        : {}),
    },
  });
}

/**
 * Scoaterea unui document din dosar.
 *
 * Se intampla des si e legitim: a intrat de doua ori aceeasi lista de plata, sau
 * s-a incarcat scanarea altei luni. Sterge doar cine poate lucra dosarul —
 * proprietarul sau cenzorul caruia i-a fost repartizat contractul.
 *
 * Randul din baza pleaca primul, fisierul din Blob dupa el: daca stergerea din
 * Blob esueaza, ramane un fisier orfan pe care nu-l mai gaseste nimeni — supărător,
 * dar nevatamator. Invers ar fi fost rau: un rand care arata un document ce nu
 * mai exista.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { id } = await params;

  const fisier = await prisma.fisier.findUnique({
    where: { id },
    select: {
      numeFisier: true,
      blobUrl: true,
      dosarId: true,
      dosar: { select: { contractId: true, etapa: true, luna: true, an: true } },
    },
  });
  if (!fisier) return NextResponse.json({ error: "Fișier negăsit" }, { status: 404 });

  if (!(await poateVedeaContractul(user, fisier.dosar.contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  // Un dosar cu raport semnat e o fotografie a ceea ce s-a verificat. Daca s-ar
  // putea scoate documente din el, semnatura ar ramane pe altceva decat s-a semnat.
  if (fisier.dosar.etapa === "semnat") {
    return NextResponse.json(
      { error: `Dosarul pe ${fisier.dosar.luna} ${fisier.dosar.an} are raport semnat. Documentele din el nu se mai pot șterge.` },
      { status: 409 },
    );
  }

  await prisma.fisier.delete({ where: { id } });
  await prisma.evenimentFlux.create({
    data: {
      dosarId: fisier.dosarId,
      etapa: "intrare",
      stare: "gata",
      mesaj: `Document scos din dosar: ${fisier.numeFisier}`,
    },
  });
  await stergeFisiere([fisier.blobUrl]);

  return NextResponse.json({ sters: true });
}
