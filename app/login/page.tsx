import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { acasaDupaRol, caleInterna } from "@/lib/rute";
import LoginForm from "./LoginForm";

/**
 * Intrarea UNICA in platforma — admin, cenzor, corporate si colegi, toti pe
 * acelasi formular. Rolul il stabileste serverul la autentificare, nu omul
 * alegand un buton: de-aia nu mai exista /login si /login
 * separate (au ramas doar ca redirectari, pentru linkurile trimise deja).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destinatie = caleInterna(next);

  // Cine e deja logat n-are ce cauta pe formular — il ducem direct la panoul lui.
  const user = await getSession();
  if (user) redirect(destinatie ?? acasaDupaRol(user.role));

  return <LoginForm next={destinatie} />;
}
