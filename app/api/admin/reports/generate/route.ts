import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

const DOC_TYPE_LABELS: Record<string, string> = {
  lista_plata: "Listă de plată",
  explicatii_lista: "Explicații listă de plată",
  distributia_facturilor: "Distribuirea facturilor",
  facturi: "Factură",
  registru_casa: "Registru casă",
  registru_banca: "Registru bancă",
  registru_jurnal: "Registru jurnal",
  situatie_activ_pasiv: "Situație activ/pasiv",
  extras_cont: "Extras de cont",
  fond_rulment: "Registru fond rulment",
  fond_reparatii: "Registru fond reparații",
  alte_fonduri: "Alt fond",
  fond_penalitati: "Registru fond penalități",
  citiri_apometre: "Citiri apometre",
  dosar_lunar: "Dosar lunar",
};

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { documentId } = await req.json();
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      association: {
        include: { user: { select: { name: true, email: true } } }
      }
    },
  });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key lipsă" }, { status: 500 });

  const findings = doc.aiFindings ? JSON.parse(doc.aiFindings) : [];
  const score = doc.aiScore ?? 0;

  // Toate documentele din același dosar
  const allDocs = await prisma.document.findMany({
    where: { associationId: doc.associationId, month: doc.month, year: doc.year },
    select: { title: true, fileName: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  // Afisam documentele individuale, nu dosarul zip
  const docsForDisplay = allDocs
    .filter((d: any) => d.type !== "dosar_lunar")
    .map((d: any) => {
      const typeLabel = DOC_TYPE_LABELS[d.type] || d.type;
      return `${typeLabel}: ${d.fileName}`;
    });

  // Logo dinamic: corporate sau VoSmart
  let logoBase64 = "";
  let logoIsCorporate = false;
  try {
    // Verificăm dacă asociația aparține unui cont corporate
    const corporate = await prisma.corporateAccount.findFirst({
      where: { associations: { some: { id: doc.associationId } } },
      select: { logoUrl: true, companyName: true }
    });

    if (corporate?.logoUrl) {
      // Logo corporate din public folder
      const corpLogoPath = path.join(process.cwd(), "public", corporate.logoUrl.replace(/^\//, ""));
      try {
        const buf = await readFile(corpLogoPath);
        logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
        logoIsCorporate = true;
      } catch {}
    }

    if (!logoBase64) {
      // Fallback: logo VoSmart
      const logoPath = path.join(process.cwd(), "public", "logo-vosmart.png");
      const logoBuffer = await readFile(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch { logoBase64 = ""; }

  // Date asociație din DB
  const assocData = {
    name: doc.association.name,
    address: doc.association.address || "",
    cui: doc.association.cui || "",
    phone: doc.association.phone || "",
    clientName: (doc.association as any).user?.name || "",
    iban: (doc.association as any).iban || "",
    bank: (doc.association as any).bank || "",
  };

  const findingsJson = findings.map((f: string, i: number) => ({
    title: `Constatarea ${i + 1}`,
    severity: "MEDIE",
    description: f,
    legal_basis: "Legea 196/2018"
  }));

  const scoreLabel = score >= 80 ? "Satisfăcător" : score >= 60 ? "Necesită atenție" : "Nesatisfăcător";
  const conclusionText = `În urma verificării documentelor pentru perioada ${doc.month || ""} ${doc.year || ""}, au fost identificate ${findings.length} constatări cu un scor de corectitudine de ${score}%. ${score >= 80 ? "Documentele sunt în mare parte conforme cu legislația în vigoare." : score >= 60 ? "Documentele necesită corecții înainte de aprobare finală." : "Documentele prezintă deficiențe semnificative care necesită remediere urgentă."}`;

  // Citim PDF-ul listei de plată pentru extragere date asociație
  const listaPlata = allDocs.find((d: any) => d.type === "lista_plata");
  const pdfContentParts: any[] = [];

  if (listaPlata) {
    try {
      const pdfPath = path.join(process.cwd(), "public", listaPlata.fileUrl.replace(/^\//, ""));
      const pdfBuffer = await readFile(pdfPath);
      const pdfBase64 = pdfBuffer.toString("base64");
      pdfContentParts.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
      });
    } catch {}
  }

  const templateJson = JSON.stringify({
    association: {
      name: assocData.name,
      address: assocData.address || "extrage din documentele atașate",
      cui: assocData.cui || "extrage din documentele atașate",
      president: "extrage din documentele atașate (footer sau antet lista de plată)",
      administrator: "extrage din documentele atașate",
      cenzor: "extrage din documentele atașate",
      period: `${doc.month || ""} ${doc.year || ""}`,
      display_date: "extrage din documentele atașate",
      due_date: "extrage din documentele atașate"
    },
    score,
    score_label: scoreLabel,
    objectives: [
      "Verificarea corectitudinii listelor de plată",
      "Verificarea corelării facturilor cu documentele contabile",
      "Respectarea prevederilor Legii 196/2018"
    ],
    documents_received: docsForDisplay,
    findings: findingsJson,
    recommendations: [
      "Corectarea discrepanțelor identificate în termen de 30 de zile",
      "Respectarea termenelor legale de afișare a listelor de plată conform art. 54 din Legea 196/2018",
      "Verificarea lunară a corelării documentelor financiare cu facturile furnizorilor"
    ],
    conclusion: conclusionText,
    positive_aspects: [
      "Documentele au fost depuse complet pentru perioada verificată",
      "Structura listelor de plată respectă formatul legal prevăzut de Legea 196/2018"
    ]
  }, null, 2);


  const textPrompt = `Ești un cenzor profesionist pentru asociații de proprietari din România.
${pdfContentParts.length > 0 ? "Analizează documentul PDF atașat (lista de plată) și extrage din el datele asociației: numele complet, adresa, CUI, președintele, administratorul, cenzorul, data afișării, data scadentă." : ""}

CONTEXT:
- Asociație în DB: ${assocData.name}, CUI: ${assocData.cui}, Adresă: ${assocData.address}
- Perioada: ${doc.month || ""} ${doc.year || ""}
- Scor corectitudine: ${score}%
- Documente primite: ${docsForDisplay.join("; ")}
- Probleme identificate: ${findings.length > 0 ? findings.join("; ") : "Nu s-au identificat probleme majore"}

SARCINA: Returnează EXCLUSIV un JSON valid, fără text înainte/după, fără markdown.
Completează câmpurile "extrage din documentele atașate" cu datele reale găsite în PDF sau în context.
Dacă nu găsești o informație, lasă câmpul gol "".

${templateJson}

REGULI:
- DOAR JSON, nimic altceva
- Extrage president, administrator, cenzor din antetul/footer-ul PDF-ului dacă există
- Îmbunătățește findings și recommendations cu detalii specifice dacă ai informații suplimentare`;

  const messageContent: any[] = [...pdfContentParts, { type: "text", text: textPrompt }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Claude API error:", errText);
    return NextResponse.json({ error: "Eroare Claude API: " + errText }, { status: 500 });
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text || "{}";

  let reportData: any = {};
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    reportData = JSON.parse(clean);
  } catch {
    reportData = {
      association: assocData,
      score,
      score_label: scoreLabel,
      findings: findingsJson,
      documents_received: docsForDisplay,
      recommendations: ["Corectarea discrepanțelor identificate"],
      conclusion: conclusionText,
      positive_aspects: []
    };
  }

  // Asigurăm că documents_received e lista reală
  if (!reportData.documents_received || reportData.documents_received.length === 0) {
    reportData.documents_received = docsForDisplay;
  }

  const htmlReport = generateBeautifulReport(reportData, doc, doc.association, logoBase64, logoIsCorporate, docsForDisplay);

  return NextResponse.json({ draft: rawText, html: htmlReport, reportData });
}

function generateBeautifulReport(data: any, doc: any, association: any, logoBase64: string = "", logoIsCorporate: boolean = false, docsForDisplay: string[] = []): string {
  const today = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
  const reportNr = `${Math.floor(Math.random() * 900) + 100}/${new Date().getFullYear()}`;
  const score = data.score ?? doc.aiScore ?? 70;
  const scoreColor = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  const scoreBg = score >= 80 ? "#ecfdf5" : score >= 60 ? "#fffbeb" : "#fef2f2";
  const scoreLabel = data.score_label || (score >= 80 ? "Satisfăcător" : score >= 60 ? "Necesită atenție" : "Nesatisfăcător");
  const severityColor: Record<string,string> = { "RIDICATĂ":"#dc2626","MEDIE-RIDICATĂ":"#ea580c","MEDIE":"#d97706","SCĂZUTĂ":"#059669" };

  const assocName = data.association?.name || association?.name || doc.association?.name || "Asociație de Proprietari";
  const assocAddr = data.association?.address || association?.address || doc.association?.address || "";
  const assocCui  = data.association?.cui || association?.cui || doc.association?.cui || "";
  const president = data.association?.president || "";
  const administrator = data.association?.administrator || association?.name || "";
  const cenzor = data.association?.cenzor || "";
  const period = data.association?.period || `${doc.month || ""} ${doc.year || ""}`;
  const displayDate = data.association?.display_date || "";
  const dueDate = data.association?.due_date || "";

  // Documents list - individual files
  const docsReceived: string[] = docsForDisplay.length > 0 ? docsForDisplay : (data.documents_received || []);
  const docTypes: Record<string,string> = {
    "lista_plata":"📋 Listă de plată","explicatii_lista":"📄 Explicații listă",
    "distributia_facturilor":"📊 Distribuție facturi","facturi":"🧾 Factură",
    "registru_casa":"💵 Registru casă","registru_banca":"🏦 Registru bancă",
    "registru_jurnal":"📓 Registru jurnal","situatie_activ_pasiv":"⚖️ Activ/Pasiv",
    "extras_cont":"🏦 Extras cont","fond_rulment":"💰 Fond rulment",
    "fond_reparatii":"🔧 Fond reparații","fond_penalitati":"⚠️ Fond penalități",
    "citiri_apometre":"💧 Citiri apometre","alte_fonduri":"📁 Alt fond",
  };

  const docsHtml = docsReceived.length > 0
    ? docsReceived.map((d: string) => `<li style="color:#374151;font-size:13px;padding:5px 0;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:8px;"><span style="color:#7c3aed;font-weight:700;">✓</span>${d}</li>`).join("")
    : `<li style="color:#6b7280;font-size:13px;font-style:italic;">Documentele au fost primite și procesate</li>`;

  const findingsHtml = (data.findings || []).map((f: any, i: number) => `
    <div style="border-left:4px solid ${severityColor[f.severity]||"#d97706"};background:#fafafa;border-radius:0 8px 8px 0;padding:16px;margin-bottom:14px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:12px;">
        <div style="font-weight:700;font-size:14px;color:#1a1a2e;line-height:1.4;">${i+1}. ${f.title||"Constatare"}</div>
        <span style="background:${severityColor[f.severity]||"#d97706"};color:white;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0;">⚠ ${f.severity||"MEDIE"}</span>
      </div>
      <p style="color:#374151;font-size:13px;line-height:1.7;margin:0 0 10px 0;">${f.description||""}</p>
      ${f.legal_basis?`<div style="background:#eff6ff;border-radius:6px;padding:8px 12px;font-size:12px;color:#1d4ed8;font-style:italic;border-left:3px solid #3b82f6;">📋 ${f.legal_basis}</div>`:""}
    </div>`).join("");

  const recsHtml = (data.recommendations||[]).map((r: string, i: number) => `
    <div style="display:flex;gap:14px;padding:13px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start;">
      <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;margin-top:1px;">${i+1}</div>
      <p style="color:#374151;font-size:13px;line-height:1.6;margin:0;">${r}</p>
    </div>`).join("");

  const positivesHtml = (data.positive_aspects||[]).map((p: string) =>
    `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;"><span style="color:#059669;font-weight:700;font-size:16px;flex-shrink:0;">✓</span><span style="color:#374151;font-size:13px;line-height:1.6;">${p}</span></div>`
  ).join("");

  const findingsCount = (data.findings||[]).length;
  const severitySummary = ["RIDICATĂ","MEDIE","SCĂZUTĂ"].map(sev => {
    const cnt = (data.findings||[]).filter((f: any) => f.severity===sev).length;
    if (!cnt) return "";
    return `<span style="background:${severityColor[sev]}20;color:${severityColor[sev]};border:1px solid ${severityColor[sev]}50;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;">${cnt} ${sev}</span>`;
  }).join(" ");

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Raport Cenzor - ${assocName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:13px;}
.page{max-width:820px;margin:0 auto;}
@page{margin:10mm 12mm;}
@media print{
  body{font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{max-width:100%;}
  .no-break{page-break-inside:avoid;}
  .hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
</style>
</head>
<body>
<div class="page">

<!-- HEADER: top bar cu logo + titlu raport -->
<div class="hdr" style="background:#0f172a;padding:18px 32px 16px;display:flex;justify-content:space-between;align-items:center;">
  <!-- Logo -->
  <div>
    ${logoBase64
      ? `<img src="${logoBase64}" alt="Logo" style="height:52px;width:auto;object-fit:contain;${!logoIsCorporate ? "mix-blend-mode:screen;" : ""}"/>`
      : `<div style="color:white;font-size:22px;font-weight:900;">VoSmart</div>`
    }
  </div>
  <!-- Titlu + nr raport -->
  <div style="text-align:right;">
    <div style="border:1px solid #7c3aed;color:#c4b5fd;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;display:inline-block;margin-bottom:5px;">Raport de Cenzor</div>
    <div style="color:#94a3b8;font-size:11px;">Nr. ${reportNr} &nbsp;|&nbsp; ${today}</div>
  </div>
</div>

<!-- SUBHEADER: date asociatie + scor -->
<div style="border:1px solid #e2e8f0;border-top:none;padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
  <div style="flex:1;">
    <div style="font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:8px;">${assocName}</div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;">
      ${assocAddr ? `<div style="font-size:12px;color:#64748b;">&#128205; ${assocAddr}</div>` : ""}
      ${assocCui ? `<div style="font-size:12px;color:#64748b;">CUI: ${assocCui}</div>` : ""}
      ${period ? `<div style="font-size:12px;color:#64748b;">Perioada: <strong>${period}</strong></div>` : ""}
    </div>
  </div>
  <!-- Scor badge -->
  <div style="border:2px solid ${scoreColor};border-radius:12px;padding:12px 20px;text-align:center;flex-shrink:0;background:${scoreBg};">
    <div style="font-size:32px;font-weight:900;color:${scoreColor};line-height:1;">${score}%</div>
    <div style="font-size:11px;color:${scoreColor};font-weight:700;margin-top:2px;">${scoreLabel}</div>
    <div style="font-size:10px;color:#6b7280;">Scor corectitudine</div>
  </div>
</div>

<!-- LINIE SEPARATOR -->
<div style="height:3px;background:linear-gradient(90deg,#7c3aed,#06b6d4,#7c3aed);"></div>

<!-- CONTENT -->
<div style="padding:24px 32px;">

  <!-- SECTION I: Date identificare -->
  <div class="no-break" style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #3b82f6;">
      <div style="width:34px;height:34px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">🏢</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA I</div><div style="font-size:15px;font-weight:700;color:#1d4ed8;">Date de identificare</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${assocCui ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Cod fiscal</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${assocCui}</div></div>` : ""}
      ${president ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Președinte</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${president}</div></div>` : ""}
      ${administrator ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Administrator</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${administrator}</div></div>` : ""}
      ${cenzor ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Cenzor</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${cenzor}</div></div>` : ""}
      ${displayDate ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Data afișării listei</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${displayDate}</div></div>` : ""}
      ${dueDate ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Data scadentă</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${dueDate}</div></div>` : ""}
      <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Data întocmirii raportului</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${today}</div></div>
      <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid #f3f4f6;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px;">Nr. raport</div><div style="font-size:13px;color:#1a1a2e;font-weight:600;">${reportNr}</div></div>
    </div>
  </div>

  <!-- SECTION II: Obiect verificare -->
  <div class="no-break" style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #7c3aed;">
      <div style="width:34px;height:34px;background:#f5f3ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">🎯</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA II</div><div style="font-size:15px;font-weight:700;color:#5b21b6;">Obiectul verificării</div></div>
    </div>
    <p style="color:#374151;font-size:13px;line-height:1.7;margin-bottom:16px;">Prezentul raport a fost întocmit în temeiul <strong>Legii nr. 196/2018</strong> privind înființarea, organizarea și funcționarea asociațiilor de proprietari și administrarea condominiilor, cu modificările și completările ulterioare, și al <strong>Ordinului nr. 1.969/2018</strong> al MDLPA.</p>
    ${(data.objectives||[]).length > 0 ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:#5b21b6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Obiective verificare:</div>
      ${(data.objectives||[]).map((o: string) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start;"><div style="width:20px;height:20px;background:linear-gradient(135deg,#7c3aed,#06b6d4);border-radius:50%;flex-shrink:0;margin-top:1px;"></div><span style="color:#374151;font-size:13px;">${o}</span></div>`).join("")}
    </div>` : ""}
    <div style="background:#faf5ff;border-radius:10px;padding:16px 18px;border:1px solid #e9d5ff;">
      <div style="font-size:11px;font-weight:700;color:#5b21b6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">📁 Documente primite pentru verificare:</div>
      <ul style="list-style:none;padding:0;columns:2;gap:16px;">${docsHtml}</ul>
    </div>
  </div>

  <!-- SECTION III: Constatari -->
  <div style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #f59e0b;">
      <div style="width:34px;height:34px;background:#fffbeb;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">🔍</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA III</div><div style="font-size:15px;font-weight:700;color:#92400e;">Constatări</div></div>
    </div>
    ${findingsCount > 0 ? `
    <div style="background:linear-gradient(135deg,#faf5ff,#eff6ff);border:1px solid #e0e7ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:16px;">
      <div><div style="font-size:30px;font-weight:900;color:#7c3aed;line-height:1;">${findingsCount}</div><div style="font-size:11px;color:#5b21b6;font-weight:600;">constatări identificate</div></div>
      <div style="flex:1;height:1px;background:linear-gradient(90deg,#7c3aed,transparent);margin:0 8px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${severitySummary}</div>
    </div>
    ${findingsHtml}` : `<div style="background:#f0fdf4;border-radius:8px;padding:16px;color:#065f46;font-size:13px;">✅ Nu au fost identificate constatări negative semnificative.</div>`}
  </div>

  ${positivesHtml ? `
  <div class="no-break" style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #10b981;">
      <div style="width:34px;height:34px;background:#ecfdf5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">✅</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA III.b</div><div style="font-size:15px;font-weight:700;color:#065f46;">Aspecte pozitive constatate</div></div>
    </div>
    ${positivesHtml}
  </div>` : ""}

  <!-- SECTION IV: Recomandari -->
  <div class="no-break" style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #7c3aed;">
      <div style="width:34px;height:34px;background:#f5f3ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">💡</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA IV</div><div style="font-size:15px;font-weight:700;color:#5b21b6;">Recomandări</div></div>
    </div>
    ${recsHtml || `<p style="color:#374151;font-size:13px;">Nu sunt recomandări suplimentare.</p>`}
  </div>

  <!-- SECTION V: Concluzie -->
  <div class="no-break" style="margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #10b981;">
      <div style="width:34px;height:34px;background:#ecfdf5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">📝</div>
      <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">SECȚIUNEA V</div><div style="font-size:15px;font-weight:700;color:#065f46;">Concluzie</div></div>
    </div>
    <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #6ee7b7;border-radius:10px;padding:20px;">
      <p style="color:#374151;font-size:13px;line-height:1.7;margin-bottom:14px;">${data.conclusion||"În urma verificărilor efectuate, documentele prezentate au fost analizate conform prevederilor legale în vigoare."}</p>
      <div style="display:flex;align-items:center;gap:14px;background:white;border-radius:8px;padding:12px 16px;border:1px solid #6ee7b7;">
        <div style="font-size:30px;font-weight:900;color:${scoreColor};line-height:1;">${score}%</div>
        <div><div style="font-weight:700;color:${scoreColor};font-size:13px;">Scor corectitudine: ${scoreLabel}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">Evaluat pe baza ${findingsCount} constatări din documentele verificate</div></div>
      </div>
    </div>
  </div>

</div>

<!-- FOOTER: Semnaturi -->
<div style="background:#f8fafc;border-top:3px solid #e2e8f0;padding:28px 32px;margin-top:8px;">
  <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:28px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
    Secțiunea VI — Semnături și Ștampile
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-bottom:24px;">
    <!-- Presedinte -->
    <div style="text-align:center;">
      <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:6px;">Președinte</div>
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;min-height:20px;margin-bottom:50px;">${president || ""}</div>
      <div style="border-top:2px solid #374151;padding-top:8px;">
        <div style="font-size:11px;color:#6b7280;">Semnătură &amp; Ștampilă</div>
      </div>
    </div>
    <!-- Administrator -->
    <div style="text-align:center;">
      <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:6px;">Administrator</div>
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;min-height:20px;margin-bottom:50px;">${administrator || ""}</div>
      <div style="border-top:2px solid #374151;padding-top:8px;">
        <div style="font-size:11px;color:#6b7280;">Semnătură &amp; Ștampilă</div>
      </div>
    </div>
    <!-- Cenzor -->
    <div style="text-align:center;background:#f5f3ff;border:1px dashed #7c3aed;border-radius:8px;padding:12px;">
      <div style="font-size:10px;color:#5b21b6;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:6px;">Cenzor</div>
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;min-height:20px;margin-bottom:40px;">${cenzor || ""}</div>
      <div style="border-top:2px solid #7c3aed;padding-top:8px;">
        <div style="font-size:11px;color:#5b21b6;font-weight:600;">Semnătură &amp; Ștampilă Cenzor</div>
      </div>
    </div>
  </div>
  <!-- Note legale -->
  <div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin-bottom:14px;border-left:3px solid #3b82f6;">
    <p style="font-size:11px;color:#1d4ed8;line-height:1.6;">
      Prezentul raport a fost întocmit în conformitate cu <strong>Legea nr. 196/2018</strong> privind înființarea, organizarea și funcționarea asociațiilor de proprietari și cu normele metodologice în vigoare. Raportul se întocmește în 2 (două) exemplare originale, câte unul pentru asociație și cenzor.
    </p>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;border-top:1px solid #e2e8f0;padding-top:10px;">
    <span>Raport nr. ${reportNr} &nbsp;|&nbsp; Data: ${today} &nbsp;|&nbsp; VoSmart — Cenzorat Inteligent. Transparență Totală.</span>
    <strong style="color:#7c3aed;">VoSmart &copy; ${new Date().getFullYear()}</strong>
  </div>
</div>

</div>
</body>
</html>`;
}
