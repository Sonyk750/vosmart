import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
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
  const dosar = await prisma.document.findUnique({
    where: { id },
    select: { associationId: true },
  });
  if (!dosar) notFound();
  if (!(await poateVedeaAsociatia(user, dosar.associationId))) notFound();

  // Fara `<main>` si fara fundal aici: le pune cadrul din /panou. Doua elemente
  // `<main>` unul in altul sunt HTML nevalid, iar un al doilea fundal peste cel
  // al cadrului se vede la marginile ecranului.
  return <PupitruCenzor dosarId={id} />;
}
