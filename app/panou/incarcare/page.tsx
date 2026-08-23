import { lunaDeLucru, numarLuna } from "@/lib/luni";
import IncarcareClient from "./IncarcareClient";

/**
 * Intrarea documentelor in aplicatie.
 *
 * Poarta si contractele vin din `layout.tsx` — aici nu se mai verifica nimic si
 * nu se mai aduce nicio lista. Contractul la care se lucreaza sta in bara de sus,
 * asa ca ecranul il primeste prin context, nu ca proprietate.
 *
 * Luna implicita se calculeaza pe SERVER si coboara ca proprietate: daca ar fi
 * calculata si sus, si jos, cele doua randari s-ar putea despica exact la
 * miezul noptii dintre luni — o nepotrivire de hidratare pe care nimeni n-ar
 * reusi sa o reproduca a doua zi.
 */
export default async function PaginaIncarcare({
  searchParams,
}: {
  searchParams: Promise<{ luna?: string; an?: string }>;
}) {
  // Din ecranul de dosare se vine cu luna in adresa („adaugă documente" la o lună
  // anume). Fara asta, omul ar ajunge aici pe luna implicita si ar trebui sa o
  // caute din nou pe cea la care tocmai se uita.
  const cerut = await searchParams;
  const implicit = lunaDeLucru();
  const luna = cerut.luna && numarLuna(cerut.luna) ? cerut.luna : implicit.luna;
  const an = Number(cerut.an) >= 2015 ? Number(cerut.an) : implicit.an;

  return <IncarcareClient implicit={{ luna, an }} />;
}
