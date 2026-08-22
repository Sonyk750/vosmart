import InConstructie from "../InConstructie";

export default function PaginaRapoarteExpert() {
  return (
    <InConstructie
      titlu="Rapoarte expert"
      descriere="Pupitrul cenzorului: documentele lunii deschise lângă constatări, cu raportul AI la vedere, iar la final semnătura."
      pasi={[
        "Deschizi dosarul lunii și ai documentele în stânga, constatările în dreapta.",
        "Îți însușești sau respingi fiecare constatare; scorul se recalculează în fața ta.",
        "Adaugi propriile constatări, pe care nicio regulă nu le-a prins.",
        "Semnezi. Raportul se salvează în dosarul lunii și devine vizibil persoanei desemnate prin contract.",
      ]}
      urmatorul={{ text: "Înapoi la panou", cale: "/panou" }}
    />
  );
}
