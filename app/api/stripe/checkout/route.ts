// POST /api/stripe/checkout — porneste plata unui pachet de pe site.
//
// Intoarce adresa paginii de plata gazduite de Stripe; datele cardului nu trec
// niciodata prin serverul nostru.
//
// Preturile NU vin din cererea browserului, ci din `lib/preturi.ts`. Din cerere
// se ia doar ce pachet vrea omul si cate apartamente are; suma o calculam aici.
// Altfel oricine schimba `leiPeLuna` in unelte si isi cumpara Professional cu
// 1 leu.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  MAX_APARTAMENTE,
  MIN_APARTAMENTE,
  costLunar,
  estePachetAsociatie,
  estePachetCorporate,
  leiInBani,
  type Pachet,
} from "@/lib/preturi";

const ADRESA = process.env.NEXT_PUBLIC_APP_URL || "https://www.vosmart.ro";

function text(v: unknown, maxim: number): string {
  return typeof v === "string" ? v.trim().slice(0, maxim) : "";
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`checkout:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: `Prea multe încercări. Reîncearcă în ${rl.retryAfter}s.` }, { status: 429 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[checkout] STRIPE_SECRET_KEY lipseste");
    return NextResponse.json({ error: "Plata online nu e configurată. Scrie-ne la office@vosmart.ro." }, { status: 503 });
  }

  let cerere: Record<string, unknown>;
  try {
    cerere = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }

  const pachet = text(cerere.pachet, 40) as Pachet;
  const eAsociatie = estePachetAsociatie(pachet);
  if (!eAsociatie && !estePachetCorporate(pachet)) {
    return NextResponse.json({ error: "Pachetul nu se poate plăti online." }, { status: 400 });
  }

  const denumire = text(cerere.denumire, 200);
  const email = text(cerere.email, 200).toLowerCase();
  const cui = text(cerere.cui, 40);
  const telefon = text(cerere.telefon, 40);
  const persoana = text(cerere.persoana, 120);

  if (!denumire) return NextResponse.json({ error: "Scrie denumirea asociației sau a firmei." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Emailul nu pare corect." }, { status: 400 });
  }

  // Numarul de apartamente conteaza numai la Smart si Premium, unde inmulteste
  // pretul. La pachetele corporate suma e fixa, deci nu-l cerem.
  let apartamente = 0;
  if (eAsociatie) {
    apartamente = Math.trunc(Number(cerere.apartamente));
    if (!Number.isFinite(apartamente) || apartamente < MIN_APARTAMENTE || apartamente > MAX_APARTAMENTE) {
      return NextResponse.json(
        { error: `Numărul de apartamente trebuie să fie între ${MIN_APARTAMENTE} și ${MAX_APARTAMENTE}.` },
        { status: 400 },
      );
    }
  }

  const { nume, lei } = costLunar(pachet, apartamente);

  try {
    const sesiune = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "ro",
      customer_email: email,
      billing_address_collection: "required",
      line_items: [
        eAsociatie
          ? {
              // Cantitatea e numarul de apartamente, ca omul sa vada pe pagina
              // Stripe "4,50 lei x 48", nu o suma aparuta de nicaieri.
              quantity: apartamente,
              price_data: {
                currency: "ron",
                unit_amount: leiInBani(lei / apartamente),
                recurring: { interval: "month" },
                product_data: { name: `Cenzorat VoSmart ${nume} — ${denumire}` },
              },
            }
          : {
              quantity: 1,
              price_data: {
                currency: "ron",
                unit_amount: leiInBani(lei),
                recurring: { interval: "month" },
                product_data: { name: `VoSmart Corporate ${nume} — ${denumire}` },
              },
            },
      ],
      // Metadatele calatoresc cu plata pana in webhook. Comanda din baza se
      // scrie si mai jos, dar daca scrierea aceea cade, webhookul o poate reface
      // doar din ce e aici — asa nu se pierde nicio plata intrata.
      metadata: {
        pachet,
        fel: eAsociatie ? "asociatie" : "corporate",
        denumire, cui, email, telefon, persoana,
        apartamente: String(apartamente),
        leiPeLuna: String(lei),
      },
      subscription_data: {
        metadata: { pachet, denumire, cui, email },
      },
      success_url: `${ADRESA}/plata/succes?sesiune={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ADRESA}/plata?pachet=${pachet}&anulat=1`,
    });

    // Randul se scrie inainte de plata, ca sa ramana urma si daca omul se
    // opreste la pagina de card. Webhookul il ridica la `platita`.
    await prisma.comanda
      .create({
        data: {
          pachet,
          fel: eAsociatie ? "asociatie" : "corporate",
          denumire,
          cui: cui || null,
          email,
          telefon: telefon || null,
          persoana: persoana || null,
          apartamente: eAsociatie ? apartamente : null,
          leiPeLuna: lei,
          stripeSessionId: sesiune.id,
        },
      })
      .catch(e => console.error("[checkout] comanda nu s-a scris:", e));

    return NextResponse.json({ url: sesiune.url });
  } catch (e) {
    console.error("[checkout] Stripe a refuzat sesiunea:", e);
    return NextResponse.json({ error: "Plata nu a putut fi pornită. Încearcă din nou." }, { status: 502 });
  }
}
