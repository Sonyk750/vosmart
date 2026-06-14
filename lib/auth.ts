import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vosmart_session")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { association: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireAdmin() {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "cenzor")) return null;
  return user;
}

export async function requireSuperAdmin() {
  const user = await getSession();
  if (!user || user.role !== "admin") return null;
  return user;
}
