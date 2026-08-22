import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaAsociatia } from "@/lib/acces";
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
      id: true, title: true, status: true, data: true, aiDraft: true,
      month: true, year: true, associationId: true, semnatDe: true, semnatLa: true,
    },
  });
  if (!raport) notFound();
  if (!(await poateVedeaAsociatia(user, raport.associationId))) notFound();

  const cenzor = user.role === "admin" || user.role === "cenzor";
  if (raport.status !== "published" && !cenzor) notFound();

  const date = raport.data as unknown as DateRaport | null;

  return (
    <main className="min-h-screen bg-app py-6 print:bg-white print:py-0">
      <BaraRaport titlu={raport.title} nesemnat={raport.status !== "published"} />

      <div className="px-4 print:px-0">
        {date ? (
          <RaportHartie date={date} titlu={raport.title} />
        ) : (
          // Rapoartele de dinaintea rescrierii n-au date structurate — doar textul
          // pe care il scrisese modelul. Il aratam asa cum e, nu il reinterpretam.
          <article className="mx-auto max-w-[820px] whitespace-pre-wrap bg-paper px-10 py-9 text-[13px] leading-relaxed text-paper-ink shadow-[0_18px_60px_-20px_rgba(0,0,0,.5)] print:shadow-none">
            <h1 className="mb-5 border-b-2 border-paper-ink pb-3 text-[20px] font-semibold">{raport.title}</h1>
            {raport.aiDraft || "Raportul nu are conținut salvat."}
          </article>
        )}
      </div>
    </main>
  );
}
