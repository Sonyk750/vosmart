import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

function getStripeClient(): Stripe {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return globalForStripe.stripe;
}

// Proxy-ul evita instantierea Stripe (si citirea STRIPE_SECRET_KEY) la
// evaluarea modulului, ca sa nu pice "Collecting page data" pe Vercel
// daca cheia e disponibila doar la runtime, nu si la build.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripeClient(), prop);
  },
});
