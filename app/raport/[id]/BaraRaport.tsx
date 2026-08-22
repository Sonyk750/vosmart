"use client";
import { Buton, Eticheta } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";

/**
 * Bara de deasupra raportului. Nu se tipareste — de aceea `print:hidden`.
 *
 * Descarcarea foloseste tiparirea browserului catre PDF, nu o a doua generare
 * de HTML. Asa, ce vede omul pe ecran si ce iese pe hartie sunt acelasi
 * document: inainte existau doua sabloane diferite si nu semanau.
 */
export default function BaraRaport({ titlu, nesemnat }: { titlu: string; nesemnat: boolean }) {
  return (
    <div className="sticky top-0 z-10 mb-5 border-b border-line bg-app/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => history.back()}
            className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-ink"
          >
            <Ic.stanga className="h-3.5 w-3.5" /> Înapoi
          </button>
          <span className="truncate text-[13px] text-muted">{titlu}</span>
          {nesemnat && <Eticheta ton="warn">Proiect nesemnat</Eticheta>}
        </div>
        <Buton fel="moale" marime="mic" onClick={() => window.print()}>
          <Ic.descarca className="h-3.5 w-3.5" /> Tipărește / salvează PDF
        </Buton>
      </div>
    </div>
  );
}
