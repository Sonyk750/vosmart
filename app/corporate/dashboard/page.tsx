import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
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

  // Aceeasi regula ca in `getSession`: contul suspendat sau neactivat iese
  // afara imediat, nu peste 30 de zile, cand expira cookie-ul.
  if (session.user.status !== "active") redirect("/login");

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
      <main className="flex min-h-screen items-center justify-center bg-app px-4 text-ink">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
              strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h1 className="text-[21px] font-semibold tracking-tight">Cont în așteptare</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Cererea de înregistrare este în curs de procesare. Primiți un email de confirmare
            în maximum 24 de ore de la activarea contului.
          </p>
          <Link href="/"
            className="mt-6 inline-block rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
            Înapoi la site
          </Link>
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
