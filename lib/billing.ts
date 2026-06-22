import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export type CorporatePackage = "trial" | "starter" | "business" | "professional" | "enterprise";
export type AssociationPackage = "smart" | "premium";

export const CORPORATE_PACKAGES: Record<CorporatePackage, { name: string; priceRon: number; maxAssoc: number; docsPerDosar: number }> = {
  trial:        { name: "Trial Gratuit", priceRon: 0,    maxAssoc: 1,    docsPerDosar: 5  },
  starter:      { name: "Starter",       priceRon: 350,  maxAssoc: 10,   docsPerDosar: 30 },
  business:     { name: "Business",      priceRon: 720,  maxAssoc: 25,   docsPerDosar: 30 },
  professional: { name: "Professional",  priceRon: 1390, maxAssoc: 50,   docsPerDosar: 30 },
  enterprise:   { name: "Enterprise",    priceRon: 0,    maxAssoc: 9999, docsPerDosar: 30 },
};

export const ASSOCIATION_PACKAGES: Record<AssociationPackage, { name: string; priceRon: number }> = {
  smart:   { name: "Smart",   priceRon: 49 },
  premium: { name: "Premium", priceRon: 89 },
};

export const DOSAR_ADDON = {
  dosare: 1,
  docsIncluded: 30,
  priceRon: 40,
};

export const DOCUMENT_ADDON = {
  documents: 1,
  priceRon: 1.3,
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
