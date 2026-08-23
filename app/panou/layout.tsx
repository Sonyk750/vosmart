import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtruContracte } from "@/lib/acces";
import Cadru from "./Cadru";
import { numaratoriMeniu } from "./date";

export const metadata: Metadata = {
  title: "Panou VoSmart",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Spatiul de lucru al firmei.
 *
 * Poarta e aici, nu in fiecare pagina: orice ecran nou pus sub /panou e protejat
 * din nastere. Trece proprietarul (rol `admin`) si cenzorul; ce vede fiecare se
 * decide mai departe, pe sectiuni.
 */
export default async function PanouLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  if (!user) redirect("/login?next=/panou");

  // Contractele se aduc o data, aici, si stau in bara de sus pentru toate
  // ecranele de dedesubt. Filtrul e cel din `lib/acces.ts`: cenzorul vede doar
  // ce i s-a repartizat.
  const [numaratori, contracte] = await Promise.all([
    numaratoriMeniu(user),
    prisma.contract.findMany({
      where: { ...filtruContracte(user), status: { not: "incheiat" } },
      orderBy: [{ status: "asc" }, { denumire: "asc" }],
      select: { id: true, denumire: true, cui: true, numar: true, status: true, ziTermen: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-app text-ink">
      <Cadru
        utilizator={{ nume: user.name ?? "", email: user.email, rol: user.role }}
        numaratori={numaratori}
        contracte={contracte}
      >
        {children}
      </Cadru>
    </div>
  );
}
