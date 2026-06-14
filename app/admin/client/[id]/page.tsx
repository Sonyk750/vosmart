import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientDetailAdmin from "./ClientDetailAdmin";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) redirect("/admin/login");

  const { id } = await params;

  const association = await prisma.association.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      documents: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!association) redirect("/admin");

  return <ClientDetailAdmin association={association} adminUser={user} />;
}
