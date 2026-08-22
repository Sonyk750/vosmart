import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import AdminDashboard from "@/app/admin/AdminDashboard";

export default async function AdminPage() {
  // Trece prin `requireAdmin` (deci prin `getSession`), nu printr-o interogare
  // proprie: verificarea de status sta intr-un singur loc, altfel pagina asta
  // ramane deschisa cu un cookie vechi dupa ce contul a fost suspendat.
  const user = await requireAdmin();
  if (!user) redirect("/login");

  return <AdminDashboard user={user} />;
}
