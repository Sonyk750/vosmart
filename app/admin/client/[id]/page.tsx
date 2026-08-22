import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientDetailAdmin from "./ClientDetailAdmin";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) redirect("/login");

  const { id } = await params;

  // Cenzorul vede DOAR asociatiile care i-au fost alocate — aceeasi clauza ca in
  // rutele surori (/api/admin/clients, documents, reports). Aici lipsea, iar
  // pagina se deschidea cu orice id: nume, CUI, adresa, toate documentele cu
  // constatarile AI si toate rapoartele unei asociatii care nu era a lui.
  const association = await prisma.association.findFirst({
    where: {
      id,
      ...(user.role === "cenzor" ? { allocations: { some: { cenzorId: user.id } } } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      documents: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!association) redirect("/admin");

  return <ClientDetailAdmin association={association as any} adminUser={user} />;
}
