import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import InConstructie from "../InConstructie";

export default async function PaginaUtilizatori() {
  // Conturile le administreaza doar proprietarul. Cenzorul are ce cauta in
  // dosare, nu in drepturile altora.
  const user = await requireSuperAdmin();
  if (!user) redirect("/panou");

  return (
    <InConstructie
      titlu="Utilizatori"
      descriere="Cine intră în aplicație și ce are voie să facă: cenzorii tăi și persoanele desemnate prin contracte."
      pasi={[
        "Adaugi cenzori și le aloci contractele de care răspund.",
        "Creezi contul persoanei desemnate prin contract, care vede doar rapoartele semnate ale asociației ei.",
        "Suspenzi sau redai accesul unui cont, cu efect la următoarea cerere, nu la expirarea cookie-ului.",
        "Vezi cine ce a semnat și când — un raport de cenzor trebuie să aibă un nume în spate.",
      ]}
      urmatorul={{ text: "Înapoi la panou", cale: "/panou" }}
    />
  );
}
