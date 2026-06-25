import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "corporate") return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { documentId } = await req.json();

  // IDOR fix: verifica ca documentul apartine contului corporate curent
  const corporateAccount = await prisma.corporateAccount.findUnique({ where: { userId: user.id } });
  if (!corporateAccount) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      association: { corporateId: corporateAccount.id },
    },
    include: { association: true },
  });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  // Trial limit: max 1 published report across all associations
  const corp = corporateAccount;
  if (corp?.package === "trial") {
    const assocIds = (await prisma.association.findMany({ where: { corporateId: corp.id }, select: { id: true } })).map(a => a.id);
    const reportCount = await prisma.report.count({ where: { associationId: { in: assocIds }, status: "published" } });
    if (reportCount >= 1) {
      return NextResponse.json({ error: "TRIAL_LIMIT", message: "Limita trial atinsă. Alege un pachet plătit pentru a emite mai multe rapoarte." }, { status: 403 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key lipsă" }, { status: 500 });

  const findings = doc.aiFindings ? JSON.parse(doc.aiFindings) : [];
  const score = doc.aiScore ?? 0;

  const prompt = `Ești un cenzor expert pentru asociații de proprietari din România.
Generează un raport de cenzor formal în română pentru:
Asociație: ${doc.association.name}
Document: ${doc.title}
Scor corectitudine: ${score.toFixed(0)}%
Probleme identificate:
${findings.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Raportul trebuie să conțină:
1. Antet formal cu data și asociația
2. Obiectul verificării cu referințe la Legea 196/2018
3. Constatări detaliate
4. Recomandări
5. Concluzie
6. Spațiu pentru semnătură cenzor`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });

  if (!response.ok) return NextResponse.json({ error: "Eroare Claude API" }, { status: 500 });
  const data = await response.json();
  return NextResponse.json({ draft: data.content?.[0]?.text || "" });
}
