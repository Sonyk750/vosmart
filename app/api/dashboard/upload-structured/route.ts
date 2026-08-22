import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { salveazaFisier } from "@/lib/stocare";
import { lipsuri, TIPURI_TRIAL, tipDeBaza } from "@/lib/cenzorat/documente";
import { ruleazaFlux } from "@/lib/cenzorat/pipeline";
import { FisierDeCitit } from "@/lib/cenzorat/extragere";

/**
 * Preluarea unui dosar.
 *
 * Ruta face un singur lucru: verifica, pune fisierele la pastrare si deschide
 * dosarul. Analiza NU se mai face aici, in coada raspunsului, cu un singur apel
 * la model si un `AbortSignal.timeout(50000)` peste el — se face in
 * `lib/cenzorat/pipeline.ts`, pe etape, fiecare cu urma ei in jurnal.
 */

export const maxDuration = 300;

/** Cat incape intr-un dosar. Peste atat, cererea nu mai ajunge intreaga la server. */
const LIMITA_DOSAR_MB = 20;

// Extensia conteaza separat de antetul MIME: antetul vine din browser, deci se
// poate minti, iar extensia decide cum ar fi servit fisierul mai tarziu. Un
// .html sau .svg incarcat drept „document" e continut activ, nu hartie.
const MIME_PERMISE = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const EXT_PERMISE = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || (!user.association && user.role !== "corporate"))
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  let associationId = user.association?.id;
  if (!associationId && user.role === "corporate") {
    const corp = await prisma.corporateAccount.findUnique({
      where: { userId: user.id },
      include: { associations: { take: 1 } },
    });
    associationId = corp?.associations[0]?.id;
  }
  if (!associationId) return NextResponse.json({ error: "Nu există asociație" }, { status: 400 });

  try {
    const form = await req.formData();
    const period = String(form.get("period") ?? "");
    const associationName = String(form.get("associationName") ?? "").trim();

    const files = form.getAll("files") as File[];
    const fileTypes = form.getAll("fileTypes").map(String);
    const fileLabels = form.getAll("fileLabels").map(String);

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: "Perioada nu este validă." }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "Nu ai atașat niciun document." }, { status: 400 });
    }

    // Ce lipseste se spune pe numele documentului („Lista de plată"), nu pe
    // cheia din baza de date („lista_plata"), ca omul sa stie ce sa caute.
    const lipsa = lipsuri(fileTypes);
    if (lipsa.length > 0) {
      return NextResponse.json({ error: `Dosarul nu e complet. Lipsesc: ${lipsa.join(", ")}.` }, { status: 400 });
    }

    const asociatie = await prisma.association.findUnique({
      where: { id: associationId },
      select: { filesUploadedCount: true, maxDocuments: true, corporateId: true },
    });

    if (asociatie?.corporateId) {
      const firma = await prisma.corporateAccount.findUnique({
        where: { id: asociatie.corporateId },
        select: { package: true, status: true },
      });

      // Ecranul „Cont în așteptare" din panou nu e o incuietoare — e doar un
      // ecran. Analiza costa bani reali la fiecare dosar, deci poarta se pune
      // aici, in ruta: cont neactivat inseamna zero dosare trimise.
      if (firma && firma.status !== "active") {
        return NextResponse.json({
          error: "Contul firmei nu este activat. Finalizați plata sau așteptați activarea de către VoSmart.",
        }, { status: 403 });
      }

      if (firma?.package === "trial") {
        const refuzate = [...new Set(fileTypes.map(tipDeBaza))].filter(t => !TIPURI_TRIAL.includes(t));
        if (refuzate.length > 0) {
          return NextResponse.json({
            error: `Contul Trial acceptă doar documentele de bază. Nu sunt incluse: ${refuzate.join(", ")}. Treceți la un plan plătit pentru dosarul complet.`,
          }, { status: 403 });
        }
      }
    }

    if (asociatie && asociatie.filesUploadedCount >= asociatie.maxDocuments) {
      return NextResponse.json({
        error: `Ați atins limita de ${asociatie.maxDocuments} dosare. Contactați administratorul pentru a o crește.`,
      }, { status: 403 });
    }

    const totalOcteti = files.reduce((s, f) => s + f.size, 0);
    if (totalOcteti > LIMITA_DOSAR_MB * 1024 * 1024) {
      return NextResponse.json({
        error: `Dosarul are ${Math.round(totalOcteti / 1024 / 1024)} MB, peste limita de ${LIMITA_DOSAR_MB} MB. Trimiteți facturile într-un singur PDF sau reduceți rezoluția scanărilor.`,
      }, { status: 413 });
    }

    const refuzat = files.find(f => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return !MIME_PERMISE.includes(f.type) || !EXT_PERMISE.includes(ext);
    });
    if (refuzat) {
      return NextResponse.json({
        error: `Fișierul „${refuzat.name}" nu este acceptat. Trimiteți PDF sau imagini (PNG, JPG, WEBP).`,
      }, { status: 415 });
    }

    /* ------------------------------------------------------- PĂSTRARE */

    const [an, luna] = period.split("-");
    const numeLuna = new Date(`${an}-${luna}-01`).toLocaleString("ro-RO", { month: "long" });

    const dosar = await prisma.document.create({
      data: {
        associationId,
        title: associationName ? `${associationName} — ${numeLuna} ${an}` : `Dosar ${numeLuna} ${an}`,
        type: "dosar_lunar",
        fileName: `dosar_${period}`,
        fileUrl: `dosare/${associationId}/${period.replace("-", "_")}/`,
        month: numeLuna,
        year: parseInt(an, 10),
        status: "analyzing",
        etapa: "intrare",
        stareEtapa: "in_lucru",
      },
    });

    // Fisierele NU ajung in `public/`: tot ce e acolo se serveste static, fara
    // verificare de sesiune. Merg in Blob, in store privat, iar continutul iese
    // doar prin ruta de descarcare, care intreaba intai a cui e dosarul.
    const pentruCitire: FisierDeCitit[] = [];
    const randuriFisiere: { documentId: string; type: string; label: string; fileName: string; blobUrl: string; mimeType: string; size: number }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tip = fileTypes[i] ?? "altele";
      const numeSigur = `${tip}_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const continut = Buffer.from(await file.arrayBuffer());

      pentruCitire.push({ tip, numeFisier: file.name, mimeType: file.type, continut });

      const salvat = await salveazaFisier(
        `dosare/${associationId}/${period.replace("-", "_")}/${numeSigur}`,
        continut,
        file.type,
      );
      if (salvat) {
        randuriFisiere.push({
          documentId: dosar.id,
          type: tip,
          label: fileLabels[i] ?? tip,
          fileName: file.name,
          blobUrl: salvat.url,
          mimeType: file.type,
          size: continut.length,
        });
      }
    }

    if (randuriFisiere.length > 0) {
      await prisma.documentFile.createMany({ data: randuriFisiere });
    }

    await prisma.association.update({
      where: { id: associationId },
      data: { filesUploadedCount: { increment: 1 } },
    });

    // Cand stocarea nu e configurata, `salveazaFisier` intoarce `null` si merge
    // mai departe — analiza se face oricum, din ce e in memorie. Problema e ca
    // pana acum tacea: dosarul iesea cu raport, dar fara niciun fisier de
    // deschis, iar cenzorul afla abia cand dadea sa se uite in lista de plata.
    // Acum se vede in jurnal, la client si la cenzor deopotriva.
    const pastrate = randuriFisiere.length;
    await prisma.evenimentFlux.create({
      data: {
        documentId: dosar.id,
        etapa: "intrare",
        stare: "gata",
        mesaj: pastrate === files.length
          ? `${files.length} ${files.length === 1 ? "document primit" : "documente primite"} · ${(totalOcteti / 1024 / 1024).toFixed(1)} MB`
          : `${files.length} documente primite, dar ${files.length - pastrate} nu au putut fi păstrate — verificarea se face, însă documentele nu vor putea fi redeschise.`,
      },
    });
    if (pastrate < files.length) {
      console.error(`[dosar] stocare indisponibilă: ${files.length - pastrate} din ${files.length} fișiere nu s-au salvat (BLOB_READ_WRITE_TOKEN?)`);
    }

    // Raspunsul pleaca acum; analiza continua dupa el. Fisierele sunt deja in
    // memorie, deci nu le mai coboram inca o data din stocare.
    after(async () => {
      await ruleazaFlux({ documentId: dosar.id, fisiere: pentruCitire });
    });

    return NextResponse.json({ success: true, documentId: dosar.id });
  } catch (e) {
    console.error("[dosar] eroare la preluare:", e);
    return NextResponse.json({ error: "Dosarul nu a putut fi preluat. Încercați din nou." }, { status: 500 });
  }
}
