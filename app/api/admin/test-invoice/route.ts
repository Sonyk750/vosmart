import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { sendPaymentInvoiceEmail } from "@/lib/email";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { to, packageKey } = await req.json().catch(() => ({}));
  const pkg = packageKey as CorporatePackage || "starter";
  const pkgInfo = CORPORATE_PACKAGES[pkg] || CORPORATE_PACKAGES.starter;

  const recipient = to || process.env.SMTP_USER || "office@vosmart.ro";

  try {
    await sendPaymentInvoiceEmail({
      name: "Ion Popescu",
      email: recipient,
      companyName: "Firma Test SRL",
      cui: "RO12345678",
      address: "Str. Exemplu nr. 1, București",
      packageName: pkgInfo.name,
      priceRon: pkgInfo.priceRon,
    });

    return NextResponse.json({ success: true, sentTo: recipient, package: pkgInfo.name, priceRon: pkgInfo.priceRon });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Eroare necunoscuta" }, { status: 500 });
  }
}
