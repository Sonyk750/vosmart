import { lunaDeLucru } from "@/lib/luni";
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
export default function PaginaIncarcare() {
  return <IncarcareClient implicit={lunaDeLucru()} />;
}
