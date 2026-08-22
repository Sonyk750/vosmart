import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { acasaDupaRol } from "@/lib/rute";
import CorporateDashboard from "./CorporateDashboard";

export default async function CorporateDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vosmart_session")?.value;
  if (!token) redirect("/login?next=/corporate/dashboard");

  // Doar interogarea sta in try. `redirect()` arunca o eroare speciala, iar un
  // try in jurul lui ar inghiti-o si ar trimite pe toata lumea in acelasi loc.
  let session;
  try {
    session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            corporateAccount: {
              include: {
                associations: {
                  include: {
                    user: { select: { name: true, email: true, status: true } },
                    documents: { orderBy: { createdAt: "desc" }, take: 3 },
                    reports: { orderBy: { createdAt: "desc" }, take: 3 },
                    _count: { select: { documents: true, reports: true } },
                  },
                  orderBy: { createdAt: "desc" },
                }
              }
            }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
    redirect("/login");
  }

  if (!session || session.expiresAt < new Date()) redirect("/login?next=/corporate/dashboard");

  const isAdmin = session.user.role === "admin";

  // Logat, dar cu alt rol: nu-l trimitem la login (ar face drumul inapoi aici),
  // ci direct in panoul care e al lui.
  if (!isAdmin && session.user.role !== "corporate") redirect(acasaDupaRol(session.user.role));

  // Admin fara cont corporate: i se creeaza unul enterprise.
  if (isAdmin && !session.user.corporateAccount) {
    await prisma.corporateAccount.create({
      data: {
        userId: session.user.id,
        companyName: "VoSmart Admin",
        package: "enterprise",
        status: "active",
        maxAssoc: 9999,
        subscriptionStatus: "active",
        activatedAt: new Date(),
      },
    });
    redirect("/corporate/dashboard");
  }

  if (!session.user.corporateAccount) redirect("/corporate");

  if (!isAdmin && session.user.corporateAccount.status === "pending") {
    return (
      <main className="min-h-screen bg-[#050814] text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">⏳</div>
          <h1 className="text-2xl font-bold mb-3">Cont în așteptare</h1>
          <p className="text-slate-300 mb-2">Cererea ta de înregistrare este în curs de procesare.</p>
          <p className="text-slate-400 text-sm">Vei primi un email de confirmare în maxim 24 ore după activarea contului.</p>
          <a href="/" className="mt-6 inline-block rounded-xl border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] transition">
            ← Înapoi la site
          </a>
        </div>
      </main>
    );
  }

  const { currentPeriodEnd, ...corporateRest } = session.user.corporateAccount;

  return (
    <CorporateDashboard
      user={session.user}
      corporate={{ ...corporateRest, currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null }}
      isAdmin={isAdmin}
    />
  );
}
