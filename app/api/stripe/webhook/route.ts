// POST /api/stripe/webhook — Stripe ne spune ce s-a intamplat cu o plata.
//
// Adresa asta e configurata in contul Stripe VoSmart si nu se schimba: daca
// ruta lipseste, Stripe primeste 404, reincearca zile intregi si apoi renunta
// de tot. Banii intra oricum — dar noi nu aflam de ei, deci nu pleaca nicio
// confirmare si nimeni nu stie ca are un client nou.
//
// Semnatura se verifica INTOTDEAUNA: fara ea, oricine cunoaste adresa ne poate
// trimite "am platit 1390 lei" de la el din browser.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { anuntaComandaNoua, trimiteConfirmareaPlatii } from "@/lib/email";

function metadata(s: Stripe.Checkout.Session, cheie: string): string {
  return (s.metadata?.[cheie] ?? "").trim();
}

function idDin(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

export async function POST(req: NextRequest) {
  const corp = await req.text();
  const semnatura = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!semnatura || !secret) {
    console.error("[webhook] lipseste semnatura sau STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Semnătură lipsă" }, { status: 400 });
  }

  let eveniment: Stripe.Event;
  try {
    eveniment = stripe.webhooks.constructEvent(corp, semnatura, secret);
  } catch (e) {
    console.error("[webhook] semnatura invalida:", e);
    return NextResponse.json({ error: "Semnătură invalidă" }, { status: 400 });
  }

  try {
    if (eveniment.type === "checkout.session.completed") {
      await plataIntrata(eveniment.data.object as Stripe.Checkout.Session);
    } else if (eveniment.type === "checkout.session.expired") {
      await prisma.comanda
        .updateMany({
          where: { stripeSessionId: (eveniment.data.object as Stripe.Checkout.Session).id, status: "initiata" },
          data: { status: "abandonata" },
        })
        .catch(e => console.error("[webhook] comanda expirata:", e));
    }
  } catch (e) {
    // Daca aruncam, Stripe reincearca — si bine face. Dar logam, ca sa se vada
    // in Vercel de ce n-a mers din prima.
    console.error("[webhook] eroare la", eveniment.type, e);
    return NextResponse.json({ error: "Eroare la procesare" }, { status: 500 });
  }

  // Orice alt eveniment: 200. Un 4xx aici l-ar face pe Stripe sa marcheze
  // adresa ca defecta si sa opreasca livrarile care chiar ne trebuie.
  return NextResponse.json({ primit: true });
}

async function plataIntrata(sesiune: Stripe.Checkout.Session) {
  const existenta = await prisma.comanda.findUnique({ where: { stripeSessionId: sesiune.id } });

  // Stripe repeta acelasi eveniment pana primeste 200. Fara oprirea asta,
  // clientul ar primi confirmarea de cinci ori.
  if (existenta?.status === "platita") return;

  const apartamente = Number(metadata(sesiune, "apartamente")) || null;
  const leiPeLuna = Number(metadata(sesiune, "leiPeLuna")) || (sesiune.amount_total ?? 0) / 100;
  const email = metadata(sesiune, "email") || sesiune.customer_details?.email || "";

  const comanda = await prisma.comanda.upsert({
    where: { stripeSessionId: sesiune.id },
    // Daca randul lipseste (scrierea de la pornirea platii a cazut), il facem
    // acum din metadate. O plata intrata nu are voie sa ramana fara urma.
    create: {
      pachet: metadata(sesiune, "pachet") || "necunoscut",
      fel: metadata(sesiune, "fel") || "corporate",
      denumire: metadata(sesiune, "denumire") || sesiune.customer_details?.name || "—",
      cui: metadata(sesiune, "cui") || null,
      email,
      telefon: metadata(sesiune, "telefon") || null,
      persoana: metadata(sesiune, "persoana") || null,
      apartamente,
      leiPeLuna,
      status: "platita",
      platitaLa: new Date(),
      stripeSessionId: sesiune.id,
      stripeCustomerId: idDin(sesiune.customer),
      stripeSubscriptionId: idDin(sesiune.subscription),
    },
    update: {
      status: "platita",
      platitaLa: new Date(),
      stripeCustomerId: idDin(sesiune.customer),
      stripeSubscriptionId: idDin(sesiune.subscription),
    },
  });

  // Pe serverless functia se opreste cand raspunde, deci emailurile se asteapta
  // aici. `allSettled`: un email cazut nu are voie sa intoarca 500 la Stripe si
  // sa declanseze reincercari pentru o plata deja inregistrata.
  await Promise.allSettled([
    anuntaComandaNoua(comanda),
    comanda.email ? trimiteConfirmareaPlatii(comanda) : Promise.resolve(),
  ]);
}
