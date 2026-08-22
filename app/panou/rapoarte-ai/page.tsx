import InConstructie from "../InConstructie";

export default function PaginaRapoarteAi() {
  return (
    <InConstructie
      titlu="Rapoarte AI"
      descriere="Verificarea automată a unei luni: regulile de cenzorat aplicate pe cifrele citite din documente."
      pasi={[
        "Alegi contractul și luna, apoi apeși „Execută verificarea”.",
        "AI-ul citește documentele lunii și întoarce cifrele; regulile calculează constatările și scorul.",
        "Raportul se salvează în dosarul lunii, lângă documentele primite și lângă inventar.",
        "De aici pleacă mai departe la expert, care îl găsește deschis în pupitrul lui.",
      ]}
      urmatorul={{ text: "Vezi ce așteaptă expertul", cale: "/panou/rapoarte-expert" }}
    />
  );
}
