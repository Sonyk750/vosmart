import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { CORPORATE_PACKAGES, CorporatePackage, getOrCreateStripeCustomer, ronToBani } from "@/lib/billing";
import {
  notifyAdminForCorporateRegistration,
  notifyApplicantCorporateWelcome,
  sendTrialVerificationEmail,
  notifyAdminForTrialRegistration,
} from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 12);
}

export function createVerificationToken(corporateId: string): string {
  const expires = Date.now() + 48 * 60 * 60 * 1000; // 48 ore
  const payload = Buffer.from(`${corporateId}:${expires}`).toString("base64url");
  const hmac = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET!).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, cui, regCom, address, phone, name, email, password, package: pkg } = await req.json();
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
        password: await hashPassword(password),
        role: "corporate",
        // Trial starts pending (needs email verification); paid starts active
        status: isTrial ? "pending" : "active",
        corporateAccount: {
          create: {
            companyName,
            cui,
            regCom: regCom || null,
            address,
            phone,
            package: pkgKey,
            maxAssoc: pkgInfo.maxAssoc,
            status: "pending",
          }
        }
      },
      include: { corporateAccount: true },
    });

    // Creăm asociația implicită pentru utilizatorul corporate
    await prisma.association.create({
      data: {
        userId: user.id,
        corporateId: user.corporateAccount!.id,
        name: companyName || "Asociația mea",
        cui: cui || null,
        address: address || null,
        package: "trial",
        maxDocuments: pkgInfo.maxAssoc,
        filesUploadedCount: 0,
      },
    });

    if (isTrial) {
      const token = createVerificationToken(user.corporateAccount!.id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vosmart.ro";
      const verificationLink = `${appUrl}/api/corporate/verify?token=${encodeURIComponent(token)}`;

      const [verificationResult, adminResult] = await Promise.allSettled([
        sendTrialVerificationEmail({ name, email: email.toLowerCase(), companyName, verificationLink }),
        notifyAdminForTrialRegistration({ name, email: email.toLowerCase(), companyName, phone, address, verificationLink }),
      ]);

      const emailErrors: string[] = [];
      if (verificationResult.status === "rejected") {
        console.error("Eroare email verificare trial:", verificationResult.reason);
        emailErrors.push(`Email verificare: ${verificationResult.reason?.message || "eroare necunoscuta"}`);
      }
      if (adminResult.status === "rejected") {
        console.error("Eroare email admin trial:", adminResult.reason);
        emailErrors.push(`Email admin: ${adminResult.reason?.message || "eroare necunoscuta"}`);
      }

      return NextResponse.json({
        success: true,
        isTrial: true,
        pending: true,
        emailSent: emailErrors.length === 0,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
        // trimitem linkul si in raspuns pentru debug (doar in dev)
        ...(process.env.NODE_ENV !== "production" ? { verificationLink } : {}),
      });
    }

    // Pachete cu pret personalizat (Enterprise, priceRon 0): nu pot trece prin
    // Checkout (ar activa gratis). Le tratam ca "oferta personalizata / va
    // contactam" — fara plata, doar notificare admin + email catre client.
    const isCustomQuote = pkgInfo.priceRon <= 0;

    // Paid plan: create a Stripe Checkout Session (hosted payment page) whose
    // URL we both redirect to AND email to the applicant as a "Finalizează
    // plata" button (valabil 24h).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vosmart.ro";
    let checkoutUrl: string | null = null;
    if (!isCustomQuote) {
      try {
      const customerId = await getOrCreateStripeCustomer("corporate", user.corporateAccount!.id);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        locale: "ro",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "ron",
              unit_amount: ronToBani(pkgInfo.priceRon),
              recurring: { interval: "month" },
              product_data: { name: `Abonament VoSmart Corporate - ${pkgInfo.name}` },
            },
          },
        ],
        subscription_data: {
          metadata: { vosmartAccountKind: "corporate", vosmartAccountId: user.corporateAccount!.id },
        },
        success_url: `${appUrl}/corporate/checkout?paid=1&pkg=${pkgKey}`,
        cancel_url: `${appUrl}/corporate`,
      });

      checkoutUrl = session.url;
      } catch (stripeError) {
        console.error("Eroare creare sesiune Checkout Stripe la inregistrare corporate:", stripeError);
      }
    }

    // IMPORTANT: pe serverless (Vercel) functia e oprita imediat ce returneaza,
    // asa ca un email "fire-and-forget" (fara await) nu apuca sa plece. Le
    // asteptam aici — emailul clientului include butonul de plata.
    await Promise.allSettled([
      notifyAdminForCorporateRegistration({
        companyName,
        name,
        email: email.toLowerCase(),
        packageName: pkgInfo.name,
        phone,
        address,
        isTrial: false,
      }),
      notifyApplicantCorporateWelcome({
        name,
        email: email.toLowerCase(),
        packageName: pkgInfo.name,
        companyName,
        isTrial: false,
        paymentUrl: checkoutUrl ?? undefined,
        isCustomQuote,
      }),
    ]);

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
