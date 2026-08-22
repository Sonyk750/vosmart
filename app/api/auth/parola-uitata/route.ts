import { NextRequest, NextResponse } from "next/server";
import { creeazaCodResetare, MINUTE_VALABILITATE } from "@/lib/parola-uitata";
import { sendCodResetareParola, emailConfigured } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Pasul 1 al resetarii: „trimite-mi un cod pe email".
 *
 * Raspunsul e IDENTIC si cand adresa are cont, si cand nu are. Altfel ruta ar
 * spune oricui daca o adresa e inregistrata pe platforma — iar adresele de firma
 * se ghicesc usor (contact@..., nume.prenume@...).
 *
 * Din acelasi motiv nu spunem nici daca emailul chiar a plecat.
 */
export async function POST(req: NextRequest) {
  // Limita pe IP: nimeni n-are nevoie sa ceara zeci de coduri pe minut. Opreste
  // si folosirea rutei ca sa bombardezi cu emailuri adresa altcuiva.
  const rl = rateLimit(`parola-uitata:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Prea multe cereri. Încearcă din nou peste câteva minute." },
      { status: 429 },
    );
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = (body.email ?? "").trim();
  } catch {
    /* ramane gol */
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Introdu adresa de email." }, { status: 400 });
  }

  // Limita pe adresa, nu doar pe IP: altfel cineva cu IP-uri multe putea trimite
  // zeci de emailuri de resetare in cutia postala a altcuiva. Raspunsul ramane
  // acelasi ca la reusita, ca sa nu spuna nici asta daca adresa are cont.
  const rlEmail = rateLimit(`parola-uitata-email:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!rlEmail.ok) {
    return NextResponse.json({ ok: true, minute: MINUTE_VALABILITATE });
  }

  try {
    const rezultat = await creeazaCodResetare(email);
    if (rezultat && emailConfigured()) {
      await sendCodResetareParola({
        to: rezultat.user.email,
        cod: rezultat.cod,
        nume: rezultat.user.name,
        minute: MINUTE_VALABILITATE,
      });
    }
  } catch (e) {
    console.error("Eroare la trimiterea codului de resetare:", e);
    return NextResponse.json({ error: "Nu am putut trimite codul. Încearcă din nou." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, minute: MINUTE_VALABILITATE });
}
