import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { notifyApplicantCorporateActivated, sendPaymentInvoiceEmail } from "@/lib/email";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Semnătură invalidă" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.vosmartType === "document_addon") {
        const purchase = await prisma.documentAddonPurchase.findUnique({
          where: { stripePaymentIntentId: pi.id },
        });
        if (purchase && purchase.status !== "completed") {
          await prisma.$transaction([
            prisma.documentAddonPurchase.update({
              where: { id: purchase.id },
              data: { status: "completed", completedAt: new Date() },
            }),
            prisma.association.update({
              where: { id: purchase.associationId },
              data: { maxDocuments: { increment: purchase.documentsAdded } },
            }),
          ]);
        }
      }
      break;
    }

    case "invoice.paid":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      let subscription: Stripe.Subscription | null = null;

      if (event.type === "invoice.paid") {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) subscription = await stripe.subscriptions.retrieve(subId);
      } else {
        subscription = event.data.object as Stripe.Subscription;
      }

      if (subscription) await syncSubscription(subscription);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const status = subscription.status;
  const periodEndUnix = subscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const association = await prisma.association.findUnique({ where: { stripeCustomerId: customerId } });
  if (association) {
    await prisma.association.update({
      where: { id: association.id },
      data: { subscriptionStatus: status, currentPeriodEnd, stripeSubscriptionId: subscription.id },
    });
    return;
  }

  const corporate = await prisma.corporateAccount.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (corporate) {
    const isActivatingNow = status === "active" && corporate.status === "pending";
    await prisma.corporateAccount.update({
      where: { id: corporate.id },
      data: {
        subscriptionStatus: status,
        currentPeriodEnd,
        stripeSubscriptionId: subscription.id,
        ...(isActivatingNow ? { status: "active", activatedAt: new Date() } : {}),
      },
    });

    if (isActivatingNow && corporate.user) {
      const pkgInfo = CORPORATE_PACKAGES[corporate.package as CorporatePackage];
      const recipientName = corporate.user.name || corporate.companyName;
      const pkgName = pkgInfo?.name || corporate.package;

      // Trimitem emailurile secvential (nu in paralel) ca sa evitam
      // probleme de rata la SMTP si sa garantam ca ambele pleaca inainte
      // ca functia serverless sa se opreasca.
      try {
        await notifyApplicantCorporateActivated({
          name: recipientName,
          email: corporate.user.email,
          packageName: pkgName,
          companyName: corporate.companyName,
        });
      } catch (e) {
        console.error("[webhook] Eroare email activare cont:", e);
      }

      if (pkgInfo && pkgInfo.priceRon > 0) {
        try {
          await sendPaymentInvoiceEmail({
            name: recipientName,
            email: corporate.user.email,
            companyName: corporate.companyName,
            cui: corporate.cui,
            regCom: corporate.regCom,
            address: corporate.address,
            packageName: pkgName,
            priceRon: pkgInfo.priceRon,
          });
        } catch (e) {
          console.error("[webhook] Eroare email factura:", e);
        }
      }
    }
  }
}
