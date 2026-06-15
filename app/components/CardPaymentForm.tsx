"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CardPaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  submitLabel?: string;
}

export default function CardPaymentForm({ clientSecret, onSuccess, submitLabel = "Plătește" }: CardPaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#7c3aed",
            colorBackground: "#0a0e1f",
            colorText: "#ffffff",
            borderRadius: "12px",
          },
        },
      }}
    >
      <CheckoutForm onSuccess={onSuccess} submitLabel={submitLabel} />
    </Elements>
  );
}

function CheckoutForm({ onSuccess, submitLabel }: { onSuccess: () => void; submitLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError("");

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "A apărut o eroare la procesarea plății.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onSuccess();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-full space-y-4">
      <PaymentElement />
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}
      <button type="submit" disabled={!stripe || submitting}
        className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
        {submitting ? "Se procesează..." : submitLabel}
      </button>
    </form>
  );
}
