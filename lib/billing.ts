import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export type CorporatePackage = "trial" | "starter" | "business" | "professional" | "enterprise";
export type AssociationPackage = "smart" | "premium";

export const CORPORATE_PACKAGES: Record<CorporatePackage, { name: string; priceRon: number; maxAssoc: number }> = {
  trial:        { name: "Trial Gratuit", priceRon: 0,    maxAssoc: 1 },
  starter:      { name: "Starter",       priceRon: 250,  maxAssoc: 5 },
  business:     { name: "Business",      priceRon: 500,  maxAssoc: 15 },
  professional: { name: "Professional",  priceRon: 900,  maxAssoc: 50 },
  enterprise:   { name: "Enterprise",    priceRon: 1500, maxAssoc: 9999 },
};

export const ASSOCIATION_PACKAGES: Record<AssociationPackage, { name: string; priceRon: number }> = {
  smart:   { name: "Smart",   priceRon: 49 },
  premium: { name: "Premium", priceRon: 89 },
};

export const DOCUMENT_ADDON = {
  documents: 10,
  priceRon: 25,
};

export function ronToBani(ron: number): number {
  return Math.round(ron * 100);
}

export type AccountKind = "association" | "corporate";

export async function getOrCreateStripeCustomer(kind: AccountKind, accountId: string): Promise<string> {
  if (kind === "association") {
    const association = await prisma.association.findUniqueOrThrow({
      where: { id: accountId },
      include: { user: { select: { email: true } } },
    });
    if (association.stripeCustomerId) return association.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: association.user.email,
      name: association.name,
      metadata: { vosmartAccountKind: "association", vosmartAccountId: association.id },
    });
    await prisma.association.update({
      where: { id: association.id },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  const corporate = await prisma.corporateAccount.findUniqueOrThrow({
    where: { id: accountId },
    include: { user: { select: { email: true } } },
  });
  if (corporate.stripeCustomerId) return corporate.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: corporate.user.email,
    name: corporate.companyName,
    metadata: { vosmartAccountKind: "corporate", vosmartAccountId: corporate.id },
  });
  await prisma.corporateAccount.update({
    where: { id: corporate.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
