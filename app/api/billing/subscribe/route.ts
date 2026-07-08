import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  ASSOCIATION_PACKAGES,
  CORPORATE_PACKAGES,
  AssociationPackage,
  CorporatePackage,
  getOrCreateStripeCustomer,
  ronToBani,
} from "@/lib/billing";
import type Stripe from "stripe";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  let kind: "association" | "corporate";
  let accountId: string;
  let subscriptionStatus: string | null;
  let priceRon: number;
  let pkgName: string;

  // Conturile corporate au si o Association implicita (package "trial") creata la
  // inregistrare, deci user.association e populat. Ramuram pe rol INAINTE de
  // user.association ca sa nu tratam gresit un cont corporate ca asociatie
  // (ASSOCIATION_PACKAGES["trial"] ar fi undefined -> 500).
  if (user.role === "corporate") {
    const corporate = await prisma.corporateAccount.findUnique({ where: { userId: user.id } });
    if (!corporate) return NextResponse.json({ error: "Cont fără abonament" }, { status: 404 });
    kind = "corporate";
    accountId = corporate.id;
    subscriptionStatus = corporate.subscriptionStatus;
    const pkg = CORPORATE_PACKAGES[corporate.package as CorporatePackage];
    if (!pkg) return NextResponse.json({ error: "Eroare server" }, { status: 500 });
    priceRon = pkg.priceRon;
    pkgName = pkg.name;
  } else if (user.association) {
    kind = "association";
    accountId = user.association.id;
    subscriptionStatus = user.association.subscriptionStatus;
    const pkg = ASSOCIATION_PACKAGES[user.association.package as AssociationPackage];
    if (!pkg) return NextResponse.json({ error: "Eroare server" }, { status: 500 });
    priceRon = pkg.priceRon;
    pkgName = pkg.name;
  } else {
    return NextResponse.json({ error: "Cont fără abonament" }, { status: 404 });
  }

  if (subscriptionStatus === "active") {
    return NextResponse.json({ error: "Abonament deja activ" }, { status: 409 });
  }

  try {
    const customerId = await getOrCreateStripeCustomer(kind, accountId);

    const price = await stripe.prices.create({
      currency: "ron",
      unit_amount: ronToBani(priceRon),
      recurring: { interval: "month" },
      product_data: { name: `Abonament VoSmart - ${pkgName}` },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice", "latest_invoice.confirmation_secret"],
      metadata: { vosmartAccountKind: kind, vosmartAccountId: accountId },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const clientSecret = invoice?.confirmation_secret?.client_secret;
    if (!clientSecret) {
      return NextResponse.json({ error: "Eroare server" }, { status: 500 });
    }

    if (kind === "association") {
      await prisma.association.update({
        where: { id: accountId },
        data: { stripeSubscriptionId: subscription.id },
      });
    } else {
      await prisma.corporateAccount.update({
        where: { id: accountId },
        data: { stripeSubscriptionId: subscription.id },
      });
    }

    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
