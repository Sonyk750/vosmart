import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContracteClient from "./ContracteClient";

/**
 * Registrul de contracte.
 *
 * Numarul se numara pe server, ca ecranul sa stie din prima randare daca e gol
 * sau nu. Fara asta, la primul contract omul ar vedea o clipa lista goala si
 * abia apoi formularul — o palpaire exact in momentul in care nu stie inca ce
 * face aplicatia.
 */
export default async function PaginaContracte() {
  const user = await requireAdmin();
  if (!user) redirect("/login?next=/panou/contracte");

  const cate = await prisma.contract.count();
  return <ContracteClient initialCount={cate} />;
}
