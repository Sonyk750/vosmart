import { requireAdmin } from "@/lib/auth";
import DosareClient from "./DosareClient";

/**
 * Dosarul, ca loc de lucru: documentele intr-o parte, constatarile in cealalta,
 * si la final raportul semnat de cenzor.
 *
 * Poarta si contractele vin din `layout.tsx`. Incarcarea si administrarea
 * lunilor NU sunt aici — sunt la „Încarcă documente", unde le e locul. Numele
 * celui care lucreaza coboara pentru inventarul tiparit.
 */
export default async function PaginaDosare() {
  const user = await requireAdmin();
  return <DosareClient intocmitDe={user?.name || user?.email || "VoSmart"} />;
}
