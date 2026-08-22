import { redirect } from "next/navigation";
import { caleInterna } from "@/lib/rute";

// Ruta veche de login corporate. A ramas doar ca sa nu pice bookmark-urile si
// linkurile trimise pe email — autentificarea se face acum intr-un singur loc.
export default async function CorporateLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const cale = caleInterna(next);
  redirect(cale ? `/login?next=${encodeURIComponent(cale)}` : "/login");
}
