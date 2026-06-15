import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { DOCUMENT_ADDON, getOrCreateStripeCustomer, ronToBani } from "@/lib/billing";

export async function POST() {
  const user = await getSession();
  if (!user || !user.association) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  try {
    const customerId = await getOrCreateStripeCustomer("association", user.association.id);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: ronToBani(DOCUMENT_ADDON.priceRon),
      currency: "ron",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        vosmartType: "document_addon",
        associationId: user.association.id,
        documentsToAdd: String(DOCUMENT_ADDON.documents),
      },
    });

    await prisma.documentAddonPurchase.create({
      data: {
        associationId: user.association.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: ronToBani(DOCUMENT_ADDON.priceRon),
        currency: "ron",
        documentsAdded: DOCUMENT_ADDON.documents,
        status: "pending",
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
