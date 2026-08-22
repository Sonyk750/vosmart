import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import PupitruCenzor from "./PupitruCenzor";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

/**
 * Pupitrul de revizuire, pe dosar.
 *
 * Verificarea de acces se face si aici, la server, nu doar in ruta de date: un
 * cenzor caruia nu i-a fost alocata asociatia nu trebuie sa vada nici macar
 * pagina goala cu numele ei.
 */
export default async function PaginaDosar({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) redirect("/login");

  const { id } = await params;
  const dosar = await prisma.dosar.findUnique({
    where: { id },
    select: { contractId: true },
  });
  if (!dosar) notFound();
  if (!(await poateVedeaContractul(user, dosar.contractId))) notFound();

  // Fara `<main>` si fara fundal aici: le pune cadrul din /panou. Doua elemente
  // `<main>` unul in altul sunt HTML nevalid, iar un al doilea fundal peste cel
  // al cadrului se vede la marginile ecranului.
  return <PupitruCenzor dosarId={id} />;
}
