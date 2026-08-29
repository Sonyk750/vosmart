import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { COOKIE_SERVICE, biletValid, esteContService } from "@/lib/service-acces";
import ServiceClient from "./ServiceClient";

export const metadata = { title: "Caiet de service — VoSmart", robots: { index: false, follow: false } };

/**
 * Caietul de service: harta aplicatiei, generata din cod.
 *
 * Pentru oricine altcineva pagina nu exista — `notFound()`, nu un ecran de
 * "acces interzis". Un refuz explicit ar spune ca exista ceva de vazut aici.
 */
export default async function PaginaService() {
  const user = await getSession();
  if (!esteContService(user?.email)) notFound();

  const deblocat = biletValid((await cookies()).get(COOKIE_SERVICE)?.value);
  return <ServiceClient deblocat={deblocat} />;
}
