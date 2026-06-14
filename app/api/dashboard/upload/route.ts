import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || !user.association) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const title = form.get("title") as string;

    if (!file || !title) return NextResponse.json({ error: "Fișier și titlu obligatorii" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fișierul depășește 10MB" }, { status: 400 });

    // Salvare locala temporara
    const uploadDir = path.join(process.cwd(), "public", "uploads", user.association.id);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/${user.association.id}/${fileName}`;

    const document = await prisma.document.create({
      data: {
        associationId: user.association.id,
        title,
        type: "uploaded_by_client",
        fileName: file.name,
        fileUrl,
        status: "analyzing",
      }
    });

    analyzeDocument(document.id, file, title).catch(console.error);

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare la upload" }, { status: 500 });
  }
}

async function analyzeDocument(documentId: string, file: File, title: string) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return;

    const fileBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    let messages: any[];

    if (isPdf) {
      messages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: `Analizează documentul financiar-contabil "${title}" al unei asociații de proprietari din România. 
          Returnează DOAR un JSON valid cu structura:
          {"score": <numar 0-100>, "findings": ["<problema 1>", "<problema 2>"], "summary": "<rezumat scurt>"}
          Score = corectitudinea documentului. Findings = probleme găsite (max 5, în română). Dacă nu sunt probleme, findings = [].` }
        ]
      }];
    } else if (isImage) {
      messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: file.type as any, data: base64 } },
          { type: "text", text: `Analizează imaginea documentului financiar-contabil "${title}".
          Returnează DOAR un JSON valid:
          {"score": <0-100>, "findings": ["<problema>"], "summary": "<rezumat>"}` }
        ]
      }];
    } else {
      messages = [{
        role: "user",
        content: `Documentul "${title}" a fost primit pentru analiză (format ${file.type}).
        Returnează DOAR JSON: {"score": 75, "findings": ["Format necitibil direct - necesită verificare manuală"], "summary": "Document primit pentru analiză manuală"}`
      }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages }),
    });

    if (!response.ok) throw new Error("Claude API error: " + await response.text());

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    let parsed: { score?: number; findings?: string[]; summary?: string } = {};
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { score: 70, findings: ["Analiză completă — verificare manuală recomandată"], summary: "Document procesat" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "analyzed",
        aiScore: parsed.score ?? 70,
        aiFindings: JSON.stringify(parsed.findings || []),
      }
    });
  } catch (e) {
    console.error("AI analysis error:", e);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "error" }
    });
  }
}