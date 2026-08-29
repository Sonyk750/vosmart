import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { emailConfigured, sendCodService } from "@/lib/email";
import { codCurent, emailService, esteContService, MINUTE_FEREASTRA } from "@/lib/service-acces";

export const runtime = "nodejs";

// POST — trimite pe email codul de acces la caiet.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!esteContService(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Butonul trimite email catre o cutie reala; fara limita, cine apasa des o umple.
  const rl = rateLimit(`service-cod:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Prea multe cereri de cod. Încearcă din nou în câteva minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const cod = codCurent();

  // Local nu exista SMTP configurat, deci emailul n-ar pleca si n-ai avea de unde
  // lua codul. In dezvoltare il scriem in consola serverului. In productie, nu.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[caiet de service] cod de acces: ${cod}\n`);
  }

  if (!emailConfigured()) {
    return NextResponse.json({
      ok: true,
      avertisment: process.env.NODE_ENV !== "production"
        ? "SMTP neconfigurat local — codul e scris în consola serverului."
        : "Emailul nu este configurat pe server.",
    });
  }

  try {
    await sendCodService({ to: emailService(), cod, minute: MINUTE_FEREASTRA });
  } catch {
    return NextResponse.json({ error: "Nu am putut trimite codul." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
