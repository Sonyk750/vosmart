import { prisma } from "@/lib/prisma";
import { amprentaRaport } from "./amprenta";
import { pdfRaportSemnat, type DateRaportSemnat } from "./raport-pdf";

/**
 * Raportul semnat al unui dosar, gata de trimis sau de descarcat.
 *
 * Inainte de orice iesire, amprenta se RECALCULEAZA din copia din baza si se
 * compara cu cea scrisa la semnare. Daca difera, copia a fost atinsa dupa
 * semnatura — si atunci nu pleaca nicaieri.
 */
export async function raportSemnatPentruIesire(dosarId: string) {
  const r = await prisma.report.findFirst({
    where: { dosarId, tip: "expert", status: "publicat" },
    select: {
      id: true, date: true, amprenta: true, bunDePlata: true, semnatDe: true, semnatLa: true,
      dosar: { select: { luna: true, an: true, contractId: true } },
      contract: {
        select: {
          denumire: true, email: true, reprezentant: true,
          persoanaNume: true, persoanaEmail: true,
          administratorNume: true, administratorEmail: true,
        },
      },
    },
  });
  if (!r) return { eroare: "Dosarul nu are raport semnat.", cod: 409 } as const;

  // Rapoartele semnate inainte de amprenta n-o au; pentru ele se calculeaza
  // acum si se spune ca atare pe document.
  const calculata = amprentaRaport(r.date);
  if (r.amprenta && r.amprenta !== calculata) {
    console.error(`[raport] amprenta nu se potrivește pentru raportul ${r.id}`);
    return { eroare: "Copia raportului nu mai corespunde cu ce s-a semnat. Raportul nu a fost trimis.", cod: 500 } as const;
  }

  const date = r.date as unknown as DateRaportSemnat;
  const pdf = await pdfRaportSemnat({ ...date, bunDePlata: r.bunDePlata ?? date.bunDePlata ?? null }, calculata);
  const numeFisier = `raport-cenzor-${r.dosar.luna}-${r.dosar.an}-${r.contract.denumire}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").slice(0, 90) + ".pdf";

  return { raport: r, pdf, numeFisier, amprenta: calculata, date } as const;
}
