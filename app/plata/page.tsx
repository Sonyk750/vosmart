import type { Metadata } from "next";
import PlataClient from "./PlataClient";

// Pagina de casa nu se indexeaza: n-are continut de cautat, iar in rezultate ar
// aparea inaintea paginilor care chiar explica pachetele.
export const metadata: Metadata = {
  title: "Plata abonamentului",
  description: "Plătește cu cardul abonamentul VoSmart, pe pagina securizată Stripe.",
  robots: { index: false, follow: true },
};

export default function PaginaPlata() {
  return <PlataClient />;
}
