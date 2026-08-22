import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vosmart_session")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  // Sesiunea expirata nu doar se refuza, ci se si sterge: altfel tabela crestea
  // la nesfarsit, cu randuri care nu mai foloseau nimanui.
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  // Statusul se verifica la FIECARE cerere, nu doar la login. Altfel suspendarea
  // unui cont n-are efect pana expira cookie-ul — adica pana la 30 de zile in
  // care cel dat afara lucreaza mai departe ca si cum nimic nu s-ar fi intamplat.
  if (session.user.status !== "active") return null;

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
