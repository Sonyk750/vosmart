import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "@/app/admin/AdminDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vosmart_session")?.value;
  
  if (!token) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { association: true } } },
  });

  if (!session || session.expiresAt < new Date()) redirect("/login");
  
  const user = session.user;
  if (user.role !== "admin" && user.role !== "cenzor") redirect("/login");

  return <AdminDashboard user={user} />;
}