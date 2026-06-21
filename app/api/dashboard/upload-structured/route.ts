import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const maxDuration = 60;

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
    const period = form.get("period") as string;
    const associationName = form.get("associationName") as string;
    const cui = form.get("cui") as string;
    const address = form.get("address") as string;

    const files = form.getAll("files") as File[];
    const fileTypes = form.getAll("fileTypes") as string[];
    const fileLabels = form.getAll("fileLabels") as string[];

    console.log("Upload - files:", files.length, "types:", fileTypes, "period:", period);

    if (!period || files.length === 0) {
      return NextResponse.json({ error: "Perioada și documentele sunt obligatorii" }, { status: 400 });
    }

    // Verificăm documentele obligatorii
    const required = ["lista_plata", "explicatii_lista", "distributia_facturilor", "facturi"];
    const uploadedTypes = fileTypes;
    const missing = required.filter(r => !uploadedTypes.includes(r));
    if (missing.length > 0) {
      return NextResponse.json({ error: `Documente obligatorii lipsă: ${missing.join(", ")}` }, { status: 400 });
    }

    // Trial: verificăm tipurile de documente permise
    const TRIAL_ALLOWED_TYPES = ["lista_plata", "explicatii_lista", "distributia_facturilor", "facturi", "extras_cont"];
    const association = await prisma.association.findUnique({
      where: { id: associationId },
      select: { filesUploadedCount: true, maxDocuments: true, corporateId: true },
    });

    if (association?.corporateId) {
      const corpAccount = await prisma.corporateAccount.findUnique({
        where: { id: association.corporateId },
        select: { package: true },
      });
      if (corpAccount?.package === "trial") {
        const blocked = fileTypes.filter((t: string) => !TRIAL_ALLOWED_TYPES.includes(t));
        if (blocked.length > 0) {
          return NextResponse.json({
            error: `Contul Trial permite doar: Listă de plată, Explicații, Distribuirea facturilor, Facturi și Extras de cont. Documentele nesolicitate: ${blocked.join(", ")}. Faceți upgrade la un plan plătit pentru toate tipurile.`,
          }, { status: 403 });
        }
      }
    }

    if (association && association.filesUploadedCount + files.length > association.maxDocuments) {
      return NextResponse.json({
        error: `Ați atins limita de ${association.maxDocuments} documente pentru asociația dvs. (${association.filesUploadedCount} încărcate). Vă rugăm contactați administratorul pentru a crește limita.`
      }, { status: 403 });
    }

    // Citim fișierele în memorie (buffer); scrierea pe disc e opțională — pe Vercel filesystem-ul e read-only
    const savedFiles: { type: string; label: string; fileName: string; fileUrl: string; buffer: Buffer; mimeType: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = fileTypes[i];
      const label = fileLabels[i];
      const safeName = `${type}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Încercăm să scriem pe disc (funcționează local, eșuează silențios pe Vercel)
      let fileUrl = `/uploads/${associationId}/${period.replace("-", "_")}/${safeName}`;
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", associationId, period.replace("-", "_"));
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, safeName), buffer);
      } catch {
        // Pe Vercel scriem în /tmp pentru durata funcției
        try {
          const tmpDir = path.join("/tmp", "vosmart", associationId, period.replace("-", "_"));
          await mkdir(tmpDir, { recursive: true });
          await writeFile(path.join(tmpDir, safeName), buffer);
        } catch { /* AI analiza foloseste buffer-ul, nu fisierul de pe disc */ }
      }

      savedFiles.push({ type, label, fileName: file.name, fileUrl, buffer, mimeType: file.type });
    }

    // Creăm un document principal în DB pentru dosar
    const [month, year] = period.split("-");
    const monthName = new Date(period + "-01").toLocaleString("ro-RO", { month: "long" });

    const mainDoc = await prisma.document.create({
      data: {
        associationId: associationId,
        title: `Dosar verificare ${monthName} ${year}`,
        type: "dosar_lunar",
        fileName: `dosar_${period}.zip`,
        fileUrl: `/uploads/${associationId}/${period.replace("-", "_")}/`,
        month: monthName,
        year: parseInt(year),
        status: "analyzing",
      }
    });

    // Incrementăm contorul de documente încărcate
    await prisma.association.update({
      where: { id: associationId },
      data: { filesUploadedCount: { increment: files.length } },
    });

    // Await explicit — pe Vercel funcția e tăiată după response, deci analiza trebuie terminată înainte
    await analyzeDocuments({
      documentId: mainDoc.id,
      associationId: associationId,
      associationName,
      cui,
      address,
      period,
      monthName,
      year,
      savedFiles,
    });

    return NextResponse.json({ success: true, documentId: mainDoc.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare la upload" }, { status: 500 });
  }
}

async function analyzeDocuments({
  documentId, associationId, associationName, cui, address,
  period, monthName, year, savedFiles
}: {
  documentId: string;
  associationId: string;
  associationName: string;
  cui: string;
  address: string;
  period: string;
  monthName: string;
  year: string;
  savedFiles: { type: string; label: string; fileName: string; fileUrl: string; buffer: Buffer; mimeType: string }[];
}) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY lipseste din variabilele de mediu Vercel");

    console.log(`[AI] Start analiza doc ${documentId}, ${savedFiles.length} fisiere, total ~${Math.round(savedFiles.reduce((s,f)=>s+f.buffer.length,0)/1024)}KB`);

    // Construim mesajul pentru Claude cu toate documentele
    const contentParts: any[] = [];

    // Adăugăm fiecare document ca PDF sau imagine
    for (const f of savedFiles) {
      const base64 = f.buffer.toString("base64");
      const isPdf = f.mimeType === "application/pdf";
      const isImage = f.mimeType.startsWith("image/");

      if (isPdf) {
        contentParts.push({
          type: "text",
          text: `\n\n=== DOCUMENT: ${f.label} (${f.type}) ===\n`
        });
        contentParts.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 }
        });
      } else if (isImage) {
        contentParts.push({
          type: "text",
          text: `\n\n=== DOCUMENT: ${f.label} (${f.type}) ===\n`
        });
        contentParts.push({
          type: "image",
          source: { type: "base64", media_type: f.mimeType, data: base64 }
        });
      } else {
        // Pentru Excel/Word - trimitem cu notă că e un format binar
        contentParts.push({
          type: "text",
          text: `\n\n=== DOCUMENT: ${f.label} (${f.type}) - Fișier: ${f.fileName} ===\n[Document în format ${f.mimeType} - analizează pe baza celorlalte documente]\n`
        });
      }
    }

    const promptText = `Ești un cenzor autorizat pentru asociații de proprietari din România, specializat în verificarea documentelor financiar-contabile conform Legii nr. 196/2018.

Asociația: ${associationName || "Asociație de proprietari"}
CUI: ${cui || "nedefinit"}
Adresă: ${address || "nedefinită"}
Perioada verificată: ${monthName} ${year}

DOCUMENTE PRIMITE:
${savedFiles.map(f => `- ${f.label}: ${f.fileName}`).join("\n")}

CONȚINUT DOCUMENTE:
${savedFiles.map(f => `=== ${f.label} (${f.type}) — ${f.fileName} ===`).join("\n")}

SARCINA TA: Întocmește un RAPORT DE CONSULTANȚĂ PRIVIND ACTIVITATEA FINANCIAR-CONTABILĂ în stilul unui cenzor profesionist român, bazat EXCLUSIV pe datele reale din documentele de mai sus.

VERIFICĂ ÎN ORDINE:

1. DATE IDENTIFICARE ASOCIAȚIE
   - Extrage din documente: denumire exactă, cod fiscal, IBAN, bancă, președinte, administrator, cenzor
   - Compară cu datele din sistem dacă diferă

2. REGISTRUL DE CASĂ
   - Sold inițial și final al lunii
   - Prima și ultima chitanță (număr și sumă)
   - Zile cu încasări
   - Dacă se respectă plafonul de casă sub 1000 lei (art. 67 Legea 196/2018)

3. REGISTRUL DE BANCĂ / EXTRASUL DE CONT
   - Sold cont curent
   - Solduri depozite (dacă există)
   - Sold cont colector (dacă există)
   - Furnizori neachitați

4. SOLDURI FONDURI
   - Fond de rulment: sold
   - Fond de reparații: sold
   - Alte fonduri (penalizări, administrative etc.)

5. RESTANȚIERI
   - Identifică apartamentele cu restanțe din lista de plată
   - Menționează numărul apartamentului și suma restantă
   - Verifică dacă s-au aplicat penalizări conform art. 77 Legea 196/2018

6. LISTA DE PLATĂ
   - Conține toate coloanele prevăzute de lege?
   - Data afișării respectă termenul de 5 zile?
   - Total cheltuieli luna curentă

7. VERIFICAREA PLĂȚILOR CĂTRE FURNIZORI
   - Plățile sunt făcute integral și prin bancă?
   - Există facturi neachitate?

8. DECLARAȚII FISCALE
   - D112 depusă la termen? (dacă există salarii în documente)

9. LEGALITATEA CHELTUIELILOR
   - Există cheltuieli fără documente justificative?
   - Bonurile fiscale au CUI-ul asociației înscris?

GENEREAZĂ RAPORTUL ÎN ACEST FORMAT EXACT:

---
# RAPORT DE CONSULTANȚĂ PRIVIND ACTIVITATEA FINANCIAR-CONTABILĂ

Atributul de identificare al Asociației de Proprietari este codul fiscal: [CUI din documente].
Consultanța contabilă se referă la luna ${monthName} ${year}.

Pe perioada supusă controlului, Asociația de Proprietari a fost reprezentată de [președinte] în calitate de președinte al Asociației.

**Președinte:** [nume din documente]
**Administrator:** [nume din documente]
**Cenzor:** [nume din documente]

---
## I. DATE DE IDENTIFICARE

| Câmp | Valoare |
|------|---------|
| Asociația de Proprietari | [din documente] |
| Cod fiscal | [din documente] |
| Adresă | [din documente] |
| Bancă | [din documente] |
| IBAN | [din documente] |
| Perioada verificată | ${monthName} ${year} |

---
## II. OBIECTUL VERIFICĂRII

Materialul documentar care a stat la baza verificării a constat în:
- verificarea registrului de casă și de bancă;
- verificarea listelor de plată a cotelor de contribuție;
- verificarea plății furnizorilor de utilități și servicii.

Documente primite:
${savedFiles.map(f => `- ${f.label}: ${f.fileName}`).join("\n")}

---
## III. CONSTATĂRI

### 1. Registrul de casă — ${monthName} ${year}
Sold inițial: [din documente] lei
Sold final: [din documente] lei
Prima chitanță: [număr] = [sumă] lei
Ultima chitanță: [număr] = [sumă] lei
[Observații dacă plafonul de casă e depășit sau alte probleme]

### 2. Situația soldurilor la data de [ultima dată din registrul bancă]
- Sold în casă: [sumă] lei
- Sold la bancă (cont curent): [sumă] lei
[- Depozite: listă cu solduri dacă există]
- Fond de rulment: [sumă] lei
- Fond de reparații: [sumă] lei
- Alte fonduri: [sumă] lei
- Furnizori pentru facturi neachitate: [sumă] lei

### 3. Restanțieri
[Dacă există restanțieri:]
Se constată existența unui nivel [ridicat/moderat/scăzut] al restanțelor. Apartamentele cu restanțe: [lista apartamentelor cu sumele].
Această situație [afectează/nu afectează] echilibrul financiar al asociației.
Conform art. 55 alin. (1) lit. o) din Legea nr. 196/2018, comitetul executiv are obligația de a urmări recuperarea creanțelor.

### 4. Lista de plată
[Observații despre lista de plată - conține coloanele legale, data afișării, total cheltuieli]

### 5. Verificarea plăților către furnizori
[Observații despre plăți - sunt integrale, prin bancă, există restanțe la furnizori]

### 6. Legalitatea cheltuielilor
[Observații despre documente justificative, bonuri fiscale cu CUI etc.]

[ADAUGĂ alte constatări relevante găsite în documente]

---
## IV. RECOMANDĂRI

[Recomandări concrete numerotate, bazate pe constatările de mai sus, cu articolele de lege aplicabile]

---
## V. CONCLUZIE

Scor corectitudine: [X]%
[Concluzie generală - documentele sunt/nu sunt conforme, ce trebuie remediat]

---
## VI. SEMNĂTURI

Prezentul raport a fost încheiat în 2 exemplare, din care un exemplar a fost înaintat Asociației de Proprietari.

Asociația de Proprietari | VoSmart Cenzorat SRL
Președinte: [nume] | Cenzor: [nume]

IMPORTANT:
- Folosește DOAR datele reale din documente, nu inventa sume
- Dacă un document lipsește sau nu ai putut citi datele, menționează explicit
- Discrepanțele sub 0,50 lei provin din rotunjiri matematice și NU sunt constatări — ignoră-le
- Concentrează-te pe probleme reale: plăți neefectuate, fonduri insuficiente, restanțieri, documente lipsă`;

    contentParts.push({ type: "text", text: promptText });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(55000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        messages: [{ role: "user", content: contentParts }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error("Claude API error: " + err);
    }

    const data = await response.json();
    const reportText = data.content?.[0]?.text || "";

    // Extragem scorul din raport
    const scoreMatch = reportText.match(/Scor corectitudine[:\s]+(\d+)%/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    // Extragem constatările ca findings
    const findingsMatch = reportText.match(/## III\. CONSTATĂRI([\s\S]*?)## IV\./);
    const findingsText = findingsMatch ? findingsMatch[1].trim() : "";
    const findings = findingsText.split(/###\s+\d+\./).filter(Boolean).map((f: string) => f.trim().split("\n")[0]).filter(Boolean);

    // Actualizăm documentul
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "analyzed",
        aiScore: score,
        aiFindings: JSON.stringify(findings.slice(0, 10)),
        aiSummary: `Dosar ${monthName} ${year} - ${savedFiles.length} documente analizate`,
      }
    });

    // Creăm raportul preliminar (draft pentru cenzor)
    await prisma.report.create({
      data: {
        associationId,
        title: `Raport cenzor ${monthName} ${year}`,
        month: monthName,
        year: parseInt(year),
        aiDraft: reportText,
        status: "draft",
      }
    });

  } catch (e: any) {
    console.error("[AI] Eroare analiza:", e?.message || e);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "error" }
    });
  }
}

