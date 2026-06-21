import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { CORPORATE_PACKAGES, CorporatePackage, getOrCreateStripeCustomer, ronToBani } from "@/lib/billing";
import { notifyAdminForCorporateRegistration, notifyApplicantCorporateWelcome } from "@/lib/email";
import crypto from "crypto";
import type Stripe from "stripe";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + process.env.NEXTAUTH_SECRET).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, cui, address, phone, name, email, password, package: pkg } = await req.json();
    if (!companyName || !name || !email || !password) {
      return NextResponse.json({ error: "Câmpurile obligatorii lipsesc" }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Există deja un cont cu acest email" }, { status: 409 });

    const pkgKey: CorporatePackage = (pkg in CORPORATE_PACKAGES ? pkg : "starter") as CorporatePackage;
    const pkgInfo = CORPORATE_PACKAGES[pkgKey];
    const isTrial = pkgKey === "trial";

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashPassword(password),
        role: "corporate",
        corporateAccount: {
          create: {
            companyName,
            cui,
            address,
            phone,
            package: pkgKey,
            maxAssoc: pkgInfo.maxAssoc,
            status: isTrial ? "active" : "pending",
            ...(isTrial ? { activatedAt: new Date() } : {}),
          }
        }
      },
      include: { corporateAccount: true },
    });

    // send notification emails (non-blocking)
    notifyAdminForCorporateRegistration({
      companyName,
      name,
      email: email.toLowerCase(),
      packageName: pkgInfo.name,
      phone,
      address,
      isTrial,
    }).catch(console.error);

    notifyApplicantCorporateWelcome({
      name,
      email: email.toLowerCase(),
      packageName: pkgInfo.name,
      companyName,
      isTrial,
    }).catch(console.error);

    // Trial: no payment needed
    if (isTrial) {
      return NextResponse.json({ success: true, isTrial: true });
    }

    // Paid: create Stripe subscription
    let clientSecret: string | null = null;
    try {
      const customerId = await getOrCreateStripeCustomer("corporate", user.corporateAccount!.id);

      const price = await stripe.prices.create({
        currency: "ron",
        unit_amount: ronToBani(pkgInfo.priceRon),
        recurring: { interval: "month" },
        product_data: { name: `Abonament VoSmart - ${pkgInfo.name}` },
      });

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice", "latest_invoice.confirmation_secret"],
        metadata: { vosmartAccountKind: "corporate", vosmartAccountId: user.corporateAccount!.id },
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice | null;
      clientSecret = invoice?.confirmation_secret?.client_secret ?? null;

      if (clientSecret) {
        await prisma.corporateAccount.update({
          where: { id: user.corporateAccount!.id },
          data: { stripeSubscriptionId: subscription.id },
        });
      }
    } catch (stripeError) {
      console.error("Eroare creare abonament Stripe la inregistrare corporate:", stripeError);
    }

    return NextResponse.json({ success: true, clientSecret });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
