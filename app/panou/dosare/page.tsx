import DosareClient from "./DosareClient";

/**
 * Dosarul, ca loc de lucru: documentele intr-o parte, constatarile in cealalta,
 * si la final raportul semnat de cenzor.
 *
 * Poarta si contractele vin din `layout.tsx`. Incarcarea si administrarea
 * lunilor NU sunt aici — sunt la „Încarcă documente", unde le e locul.
 */
export default function PaginaDosare() {
  return <DosareClient />;
}
