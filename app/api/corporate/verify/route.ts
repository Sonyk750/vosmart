import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyApplicantCorporateWelcome } from "@/lib/email";
import crypto from "crypto";

function verifyToken(token: string): { corporateId: string; valid: boolean } {
  const parts = token.split(".");
  if (parts.length !== 2) return { corporateId: "", valid: false };
  const [payload, hmac] = parts;

  const expectedHmac = crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET!)
    .update(payload)
    .digest("hex");
  if (hmac !== expectedHmac) return { corporateId: "", valid: false };

  try {
    const decoded = Buffer.from(payload, "base64url").toString();
    const [corporateId, expiresStr] = decoded.split(":");
    if (!corporateId || !expiresStr) return { corporateId: "", valid: false };
    if (Date.now() > parseInt(expiresStr)) return { corporateId: "", valid: false };
    return { corporateId, valid: true };
  } catch {
    return { corporateId: "", valid: false };
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vosmart.ro";

  if (!token) {
    return NextResponse.redirect(`${appUrl}/corporate/verify?status=invalid`);
  }

  const { corporateId, valid } = verifyToken(token);
  if (!valid || !corporateId) {
    return NextResponse.redirect(`${appUrl}/corporate/verify?status=expired`);
  }

  try {
    const corporate = await prisma.corporateAccount.findUnique({
      where: { id: corporateId },
      include: { user: { select: { id: true, name: true, email: true, status: true } } },
    });

    if (!corporate) {
      return NextResponse.redirect(`${appUrl}/corporate/verify?status=invalid`);
    }

    if (corporate.status === "active" && corporate.user?.status === "active") {
      return NextResponse.redirect(`${appUrl}/corporate/verify?status=already`);
    }

    await prisma.$transaction([
      prisma.corporateAccount.update({
        where: { id: corporateId },
        data: { status: "active", activatedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: corporate.userId },
        data: { status: "active" },
      }),
    ]);

    // Send welcome email after activation
    if (corporate.user) {
      notifyApplicantCorporateWelcome({
        name: corporate.user.name || corporate.companyName,
        email: corporate.user.email,
        packageName: "Trial Gratuit",
        companyName: corporate.companyName,
        isTrial: true,
      }).catch(console.error);
    }

    return NextResponse.redirect(`${appUrl}/corporate/verify?status=success`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${appUrl}/corporate/verify?status=error`);
  }
}
