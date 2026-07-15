import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { ASISTENT_MANUAL, ASISTENT_MANUAL_ADMIN } from "@/lib/asistent-manual";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Modelul „deștept" care răspunde (și alimentează cache-ul). Sonnet 5 = calitate
// aproape de Opus la ~5x mai ieftin. Poți urca la "claude-opus-4-8".
const SMART_MODEL = "claude-sonnet-5";
// Model ieftin doar pentru „portar": decide dacă întrebarea e despre aplicație.
const GATE_MODEL = "claude-haiku-4-5";
const MAX_MESSAGES = 20;

const OFF_TOPIC_MSG =
  "Pot răspunde doar la întrebări despre folosirea aplicației VoSmart — cont, încărcarea dosarelor, " +
  "analiza AI, rapoarte de cenzor, abonament etc. Reformulează te rog întrebarea legată de aplicație. 🙂";

const GATE_SYSTEM =
  "Ești un clasificator pentru aplicația VoSmart (serviciu de cenzor/audit cu AI pentru asociațiile de " +
  "proprietari din România, conform Legii 196/2018: cont corporate, încărcarea dosarelor financiare, " +
  "analiza AI, rapoarte de cenzor, abonament). Răspunde DOAR cu un cuvânt — YES sau NO: întrebarea " +
  "utilizatorului ține de folosirea acestei aplicații sau de cenzoratul/auditul asociațiilor? YES dacă e " +
  "legată (chiar și vag). NO dacă e complet nelegată (vreme, matematică, programare, rețete, opinii " +
  "generale, conversație personală etc.).";

interface ChatMsg { role: "user" | "assistant"; content: string }

// Cheie de cache: fără diacritice, litere/cifre + spații, colapsat.
function normalize(q: string): string {
  return q
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Portar ieftin: e întrebarea despre aplicație? La eroare, fail-open.
async function isOnTopic(client: Anthropic, question: string): Promise<boolean> {
  try {
    const r = await client.messages.create({
      model: GATE_MODEL, max_tokens: 3, system: GATE_SYSTEM,
      messages: [{ role: "user", content: question }],
    });
    const b = r.content.find(x => x.type === "text");
    const txt = b && b.type === "text" ? b.text.trim().toLowerCase() : "";
    return txt.startsWith("y");
  } catch {
    return true;
  }
}

// Limită anti-abuz pentru vizitatorii anonimi de pe site (fără cont): 15
// mesaje / oră / IP, ca să protejăm costul. Utilizatorii autentificați (clienți
// corporate din panou) nu sunt limitați.
const ANON_LIMIT = 15;
const ANON_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Asistentul e disponibil și public (pe site vosmart.ro), și în panoul corporate.
  // Anonimii sunt limitați pe IP; utilizatorii logați trec fără limită.
  const user = await getSession();
  if (!user) {
    const rl = rateLimit(`asistent:${clientIp(req)}`, ANON_LIMIT, ANON_WINDOW_MS);
    if (!rl.ok) {
      return new Response(
        JSON.stringify({ error: `Ai atins limita de întrebări. Încearcă din nou peste ~${Math.ceil(rl.retryAfter / 60)} min sau creează-ți un cont.` }),
        { status: 429 },
      );
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Asistentul nu este configurat (lipsește ANTHROPIC_API_KEY)." }), { status: 500 });
  }

  // Utilizatorii interni (admin/cenzor) primesc manualul extins cu panoul de
  // administrare. Pentru ei NU folosim cache (răspunsurile interne nu trebuie
  // să ajungă în cache-ul public) și sărim peste portar (întrebări interne).
  const isStaff = !!user && (user.role === "admin" || user.role === "cenzor");
  const systemManual = isStaff ? `${ASISTENT_MANUAL}\n\n${ASISTENT_MANUAL_ADMIN}` : ASISTENT_MANUAL;

  const MANUAL_VER = createHash("sha1").update(ASISTENT_MANUAL).digest("hex").slice(0, 12);

  const body = await req.json().catch(() => null);
  const raw: any[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMsg[] = raw
    .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    .slice(-MAX_MESSAGES);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Mesaj lipsă" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const streamText = (text: string) =>
    new Response(new ReadableStream({
      start(controller) { controller.enqueue(encoder.encode(text)); controller.close(); },
    }), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

  const standalone = messages.length === 1;
  const useCache = standalone && !isStaff;
  const qNorm = standalone ? normalize(messages[0].content) : "";

  if (useCache && qNorm.length >= 3) {
    const hit = await prisma.asistentCache.findUnique({ where: { questionNorm: qNorm } }).catch(() => null);
    if (hit && hit.ver === MANUAL_VER && hit.answer) {
      prisma.asistentCache.update({ where: { id: hit.id }, data: { hits: { increment: 1 } } }).catch(() => {});
      return streamText(hit.answer);
    }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Portar: la o întrebare nouă, verificăm ieftin dacă e despre aplicație.
  // Staff-ul (admin/cenzor) e de încredere și întreabă despre operațiuni interne — sare peste portar.
  if (standalone && !isStaff) {
    const onTopic = await isOnTopic(client, messages[0].content);
    if (!onTopic) return streamText(OFF_TOPIC_MSG);
  }

  const anthropicStream = client.messages.stream({
    model:      SMART_MODEL,
    max_tokens: 1500,
    thinking:   { type: "disabled" },
    system: [
      { type: "text", text: systemManual, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      let acc = "";
      let ok = false;
      try {
        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            acc += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        ok = true;
      } catch {
        controller.enqueue(encoder.encode("\n\n_A apărut o eroare. Încearcă din nou._"));
      } finally {
        controller.close();
      }
      if (ok && useCache && qNorm.length >= 3 && acc.trim()) {
        prisma.asistentCache.upsert({
          where:  { questionNorm: qNorm },
          create: { questionNorm: qNorm, question: messages[0].content, answer: acc, ver: MANUAL_VER },
          update: { question: messages[0].content, answer: acc, ver: MANUAL_VER },
        }).catch(() => {});
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
