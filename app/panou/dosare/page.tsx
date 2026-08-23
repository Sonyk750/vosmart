import { requireAdmin } from "@/lib/auth";
import DosareClient from "./DosareClient";

/**
 * Dosarele lunare ale contractului.
 *
 * Poarta si contractele vin din `layout.tsx`; aici doar aflam numele celui care
 * lucreaza, fiindca el se scrie pe inventarul tiparit, sub semnatura.
 */
export default async function PaginaDosare() {
  const user = await requireAdmin();
  return <DosareClient intocmitDe={user?.name || user?.email || "VoSmart"} />;
}
