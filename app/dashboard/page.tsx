import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vosmart_session")?.value;

  if (!token) redirect("/clienti");

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { association: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect("/clienti");

  return <DashboardClient user={session.user} />;
}