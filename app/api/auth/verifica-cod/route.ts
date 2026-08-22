import { NextRequest, NextResponse } from "next/server";
import { verificaCod, MAX_INCERCARI } from "@/lib/parola-uitata";
import { mesajEsecCod } from "@/lib/parola-cod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Pasul 2 din trei: „codul asta e bun?".
 *
 * Exista separat pentru ca ecranul arata campurile de parola noua abia dupa ce
 * codul e confirmat. Ruta NU consuma codul si NU intoarce nimic despre cont in
 * afara de da/nu — cine il are oricum va trimite si parola imediat dupa.
 *
 * Numaratoarea incercarilor gresite sta in BAZA, in `verificaCod`, si e comuna
 * cu ruta de salvare: cele doua rute nu ofera impreuna mai multe sanse decat una.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`verifica-cod:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Prea multe încercări. Așteaptă câteva minute." }, { status: 429 });
  }

  let email = "", cod = "";
  try {
    const body = (await req.json()) as { email?: string; cod?: string };
    email = (body.email ?? "").trim();
    cod = (body.cod ?? "").trim();
  } catch {
    /* raman goale */
  }

  if (!email || !cod) {
    return NextResponse.json({ error: "Completează codul primit pe email." }, { status: 400 });
  }

  const r = await verificaCod(email, cod);
  if (r.ok) return NextResponse.json({ ok: true });

  return NextResponse.json(
    {
      error: mesajEsecCod(r.motiv, r.incercariRamase, MAX_INCERCARI),
      motiv: r.motiv,
      reia: r.motiv !== "gresit",
    },
    { status: 400 },
  );
}
