import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Endpoint de diagnostic pentru variabilele de mediu in productie.
// Protejat printr-un token DEDICAT (HEALTH_CHECK_TOKEN) ca sa nu expuna public
// configuratia. Nu cade niciodata pe NEXTAUTH_SECRET: daca tokenul dedicat nu e
// setat, endpointul e efectiv dezactivat.
//   GET /api/health?token=<HEALTH_CHECK_TOKEN>
//   adauga &verify=1 pentru a testa si conexiunea SMTP live (login real).
export const dynamic = "force-dynamic";

function present(v?: string | null): boolean {
  return !!(v && v.trim());
}

function stripeMode(k: string): string {
  if (k.startsWith("sk_live") || k.startsWith("pk_live") || k.startsWith("rk_live")) return "live";
  if (k.startsWith("sk_test") || k.startsWith("pk_test") || k.startsWith("rk_test")) return "test";
  return present(k) ? "unknown-format" : "MISSING";
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.HEALTH_CHECK_TOKEN;
  // Fara token dedicat configurat endpointul e dezactivat — nu comparam
  // niciodata cu NEXTAUTH_SECRET (secretul cu care semnam tokenele).
  if (!expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Comparatie in timp constant; timingSafeEqual cere buffere de lungime egala,
  // asa ca respingem intai orice diferenta de lungime (inclusiv token lipsa).
  const provided = Buffer.from(token ?? "", "utf8");
  const secret = Buffer.from(expected, "utf8");
  if (provided.length !== secret.length || !timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Variabile care, daca lipsesc, rup inregistrarea corporate / emailurile / plata.
  const required: Record<string, boolean> = {
    SMTP_HOST: present(process.env.SMTP_HOST),
    SMTP_USER: present(process.env.SMTP_USER),
    SMTP_PASS: present(process.env.SMTP_PASS),
    STRIPE_SECRET_KEY: present(process.env.STRIPE_SECRET_KEY),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: present(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    STRIPE_WEBHOOK_SECRET: present(process.env.STRIPE_WEBHOOK_SECRET),
    NEXT_PUBLIC_APP_URL: present(process.env.NEXT_PUBLIC_APP_URL),
    DATABASE_URL: present(process.env.DATABASE_URL),
    NEXTAUTH_SECRET: present(process.env.NEXTAUTH_SECRET),
    BLOB_READ_WRITE_TOKEN: present(process.env.BLOB_READ_WRITE_TOKEN),
  };

  const missing = Object.entries(required)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  // Detalii sigure (fara secrete): valori non-sensibile + prefix chei Stripe.
  const details = {
    smtp: {
      SMTP_HOST: process.env.SMTP_HOST || null,
      SMTP_PORT: process.env.SMTP_PORT || "465 (default)",
      SMTP_USER: present(process.env.SMTP_USER),
      SMTP_PASS: present(process.env.SMTP_PASS),
      EMAIL_FROM: process.env.EMAIL_FROM || null,
      ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro (default)",
      // Aceeasi conditie ca lib/email.ts -> canSendEmail()
      canSendEmail: present(process.env.SMTP_HOST) && present(process.env.SMTP_USER) && present(process.env.SMTP_PASS),
    },
    stripe: {
      STRIPE_SECRET_KEY: stripeMode(process.env.STRIPE_SECRET_KEY || ""),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripeMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""),
      STRIPE_WEBHOOK_SECRET: present(process.env.STRIPE_WEBHOOK_SECRET),
    },
    app: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
      NODE_ENV: process.env.NODE_ENV || null,
      DATABASE_URL: present(process.env.DATABASE_URL),
      NEXTAUTH_SECRET: present(process.env.NEXTAUTH_SECRET),
    },
    // Fara tokenul de Blob nu se poate primi niciun document; fara `sharp`,
    // scanarile intra in dosar asa cum au venit — de cinci ori mai grele.
    // Amandoua se vad doar in productie, pe runtime-ul de acolo, deci se
    // intreaba de aici.
    documente: {
      BLOB_READ_WRITE_TOKEN: present(process.env.BLOB_READ_WRITE_TOKEN),
    },
  };

  // `sharp` are binare native, iar ele se aleg dupa platforma la instalare. Aici
  // se afla daca cel de Linux a ajuns cu adevarat in functie sau daca recodarea
  // cade tacut inapoi pe „pastreaza originalul".
  let recodare: string;
  try {
    const { default: sharp } = await import("sharp");
    const proba = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "#8899aa" },
    }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const dupa = await sharp(proba).rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();
    const m = await sharp(dupa).metadata();
    recodare = `ok — sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}, probă 3000x2000 → ${m.width}x${m.height}`;
  } catch (e) {
    recodare = `FAIL — ${(e as Error)?.message || "eroare necunoscuta"}. Scanările se vor păstra neredimensionate.`;
  }

  // Test optional al conexiunii SMTP (login real), time-boxed ca sa nu atarne.
  let smtpVerify: string | undefined;
  if (req.nextUrl.searchParams.get("verify") === "1" && details.smtp.canSendEmail) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
      await transporter.verify();
      smtpVerify = "ok — conexiune si login SMTP reusite";
    } catch (e) {
      smtpVerify = `FAIL — ${(e as Error)?.message || "eroare necunoscuta"}`;
    }
  }

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    details,
    recodare,
    ...(smtpVerify ? { smtpVerify } : {}),
    hint: missing.length
      ? "Seteaza variabilele lipsa in Vercel -> Settings -> Environment Variables (Production) si redeploy."
      : "Toate variabilele critice sunt setate.",
  });
}
