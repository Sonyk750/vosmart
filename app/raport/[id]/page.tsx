import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import RaportHartie, { DateRaport } from "@/app/components/RaportHartie";
import BaraRaport from "./BaraRaport";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

/**
 * Un raport, deschis.
 *
 * Aceeasi pagina si pentru asociatie, si pentru cenzor — se schimba doar ce are
 * voie sa vada fiecare, iar asta decide `poateVedeaAsociatia`. Proiectul
 * nesemnat il vad doar cenzorul si adminul: pana la semnatura nu e un raport,
 * e o parere a masinii.
 */
export default async function PaginaRaport({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const raport = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true, titlu: true, tip: true, status: true, date: true,
      contractId: true, semnatDe: true, semnatLa: true,
    },
  });
  if (!raport) notFound();
  if (!(await poateVedeaContractul(user, raport.contractId))) notFound();

  const cenzor = user.role === "admin" || user.role === "cenzor";
  // Clientul vede doar raportul de expert, semnat. Raportul AI si proiectele
  // nesemnate raman intre noi: pana la semnatura nu e un raport, e o parere a
  // masinii.
  if (!cenzor && (raport.tip !== "expert" || raport.status !== "publicat")) notFound();

  const date = raport.date as unknown as DateRaport | null;

  return (
    <main className="min-h-screen bg-app py-6 print:bg-white print:py-0">
      <BaraRaport titlu={raport.titlu} nesemnat={raport.status !== "publicat"} />

      <div className="px-4 print:px-0">
        {date ? (
          <RaportHartie date={date} titlu={raport.titlu} />
        ) : (
          <article className="mx-auto max-w-[820px] bg-paper px-10 py-9 text-[13px] leading-relaxed text-paper-ink shadow-[0_18px_60px_-20px_rgba(0,0,0,.5)] print:shadow-none">
            <h1 className="mb-5 border-b-2 border-paper-ink pb-3 text-[20px] font-semibold">{raport.titlu}</h1>
            <p className="text-paper-muted">Raportul nu are conținut salvat.</p>
          </article>
        )}
      </div>
    </main>
  );
}
