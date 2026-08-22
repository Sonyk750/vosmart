import InConstructie from "../InConstructie";

export default function PaginaContracte() {
  return (
    <InConstructie
      titlu="Contracte"
      descriere="Registrul asociațiilor și firmelor cu care ai contract de cenzorat. De aici pornește tot: fără contract nu există lună, documente sau raport."
      pasi={[
        "Adaugi un contract introducând CUI-ul — denumirea, adresa și datele de la Registrul Comerțului se completează singure.",
        "Completezi persoana desemnată prin contract: ea e singura care va putea descărca rapoartele semnate din contul ei.",
        "Stabilești termenul lunar până la care asociația trebuie să trimită documentele.",
        "Deschizi un contract și vezi toate lunile lui, fiecare cu documentele, inventarul, raportul AI și raportul semnat.",
      ]}
      urmatorul={{ text: "Vezi fluxul lunii", cale: "/panou/flux" }}
    />
  );
}
