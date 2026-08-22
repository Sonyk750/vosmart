import InConstructie from "../InConstructie";

export default function PaginaIncarcare() {
  return (
    <InConstructie
      titlu="Încarcă documente"
      descriere="Aici intră documentele primite de la asociație și se așază în luna care le privește."
      pasi={[
        "Alegi contractul și luna la care se referă documentele.",
        "Arunci tot ce ai primit deodată — inclusiv o arhivă. Tipul fiecărui document se recunoaște din nume.",
        "AI-ul citește ce a intrat și întocmește inventarul: ce s-a primit, ce lipsește față de un dosar complet, ce nu e lizibil.",
        "Inventarul se salvează lângă documente, în dosarul lunii, și rămâne acolo.",
      ]}
      urmatorul={{ text: "Vezi fluxul lunii", cale: "/panou/flux" }}
    />
  );
}
