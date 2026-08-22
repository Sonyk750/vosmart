import { NextRequest, NextResponse } from "next/server";
import { schimbaParolaCuCod, MAX_INCERCARI } from "@/lib/parola-uitata";
import { mesajEsecCod } from "@/lib/parola-cod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Pasul 3 al resetarii: codul din email plus parola noua.
 *
 * Numaratoarea incercarilor gresite sta in BAZA, in `schimbaParolaCuCod` — asta
 * e apararea reala. Limita de mai jos e doar pentru rafala: pe Vercel memoria
 * unei instante se sterge la pornirea la rece, deci nu se poate baza nimic pe ea.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`parola-noua:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Prea multe încercări. Așteaptă câteva minute." }, { status: 429 });
  }

  let email = "", cod = "", parola = "";
  try {
    const body = (await req.json()) as { email?: string; cod?: string; parola?: string };
    email = (body.email ?? "").trim();
    cod = (body.cod ?? "").trim();
    parola = body.parola ?? "";
  } catch {
    /* raman goale */
  }

  if (!email || !cod) {
    return NextResponse.json({ error: "Completează codul primit pe email." }, { status: 400 });
  }

  const r = await schimbaParolaCuCod(email, cod, parola);
  if (r.ok) return NextResponse.json({ ok: true });

  // 400, nu 401: nu e o problema de autentificare, ci un camp completat gresit —
  // iar 401 ar trimite portarul din proxy.ts sa creada ca cere logare.
  return NextResponse.json(
    {
      error: mesajEsecCod(r.motiv, r.incercariRamase, MAX_INCERCARI),
      motiv: r.motiv,
      reia: r.motiv !== "gresit" && r.motiv !== "parola-slaba",
    },
    { status: 400 },
  );
}
