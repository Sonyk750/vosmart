import Stripe from "stripe";

const globalPentruStripe = globalThis as unknown as { stripe: Stripe | undefined };

function clientStripe(): Stripe {
  if (!globalPentruStripe.stripe) {
    globalPentruStripe.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return globalPentruStripe.stripe;
}

// Proxy-ul amana instantierea (si citirea `STRIPE_SECRET_KEY`) pana la primul
// apel. Fara el, "Collecting page data" de pe Vercel pica atunci cand cheia
// exista doar la runtime, nu si la build.
export const stripe = new Proxy({} as Stripe, {
  get(_tinta, prop) {
    return Reflect.get(clientStripe(), prop);
  },
});
