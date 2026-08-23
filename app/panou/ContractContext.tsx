"use client";
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Ic } from "@/app/components/icoane";

/**
 * Contractul la care se lucreaza acum.
 *
 * Aproape tot ce se face in panou se face PENTRU UN CONTRACT: documentele intra
 * in dosarul unei luni dintr-un contract, raportul se da pe un contract. Pana
 * acum fiecare ecran isi punea propria casuta de alegere, iar cine trecea de la
 * incarcare la rapoarte trebuia sa aleaga din nou aceeasi asociatie.
 *
 * Alegerea sta o singura data, in bara de sus, si e aceeasi pe toate paginile.
 * Se tine in `localStorage`, deci se pastreaza intre reincarcari si intre taburi
 * — la fel ca latimea meniului, si din acelasi motiv: e o stare din AFARA lui
 * React, deci se citeste ca atare, nu cu un efect care face `setState`.
 */

const CHEIE = "vosmart:contract";
const ascultatori = new Set<() => void>();

function aboneaza(anunta: () => void) {
  ascultatori.add(anunta);
  window.addEventListener("storage", anunta);
  return () => {
    ascultatori.delete(anunta);
    window.removeEventListener("storage", anunta);
  };
}

function citeste(): string {
  try {
    return localStorage.getItem(CHEIE) ?? "";
  } catch {
    // Fereastra privata sau stocare oprita: se lucreaza pe primul contract.
    return "";
  }
}

/** Pe server nu exista `localStorage`; pornim de la „nimic ales". */
const laServer = () => "";

function scrie(id: string) {
  try {
    localStorage.setItem(CHEIE, id);
  } catch { /* la fel: nu putem tine minte, dar putem functiona */ }
  ascultatori.forEach(anunta => anunta());
}

export type ContractScurt = {
  id: string;
  denumire: string;
  cui: string;
  numar: string | null;
  status: string;
  ziTermen: number;
};

type Valoare = {
  contracte: ContractScurt[];
  /** Contractul curent. `null` doar cand firma nu are niciun contract. */
  ales: ContractScurt | null;
  alege: (id: string) => void;
};

const Ctx = createContext<Valoare | null>(null);

export function ProviderContract({
  contracte, children,
}: {
  contracte: ContractScurt[];
  children: React.ReactNode;
}) {
  const salvat = useSyncExternalStore(aboneaza, citeste, laServer);

  // Daca ce e in `localStorage` nu mai exista — contract incheiat, sau cenzor
  // caruia i s-a luat repartizarea — se cade pe primul din lista, nu pe gol.
  const ales = contracte.find(c => c.id === salvat) ?? contracte[0] ?? null;

  const valoare = useMemo<Valoare>(() => ({ contracte, ales, alege: scrie }), [contracte, ales]);

  return <Ctx.Provider value={valoare}>{children}</Ctx.Provider>;
}

export function useContract(): Valoare {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContract se poate folosi doar sub <ProviderContract>.");
  return v;
}

/* ------------------------------------------------------------- SELECTORUL */

export function SelectorContract() {
  const { contracte, ales, alege } = useContract();
  const [deschis, setDeschis] = useState(false);

  if (contracte.length === 0) {
    return (
      <Link href="/panou/contracte"
        className="flex items-center gap-2 rounded-[var(--radius-field)] border border-dashed border-line-strong px-3 py-1.5 text-[13px] text-faint transition-colors hover:border-brand/50 hover:text-ink">
        <Ic.plus className="h-3.5 w-3.5" /> Adaugă primul contract
      </Link>
    );
  }

  const singur = contracte.length === 1;

  return (
    <div className="relative min-w-0">
      <button
        onClick={() => setDeschis(v => !v)}
        disabled={singur}
        aria-haspopup="listbox"
        aria-expanded={deschis}
        className={`flex min-w-0 max-w-[min(70vw,420px)] items-center gap-2.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-2 py-1.5 pl-2.5 pr-3 text-left transition-colors ${
          singur ? "cursor-default" : "hover:bg-surface-3"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-dim text-brand-soft">
          <Ic.contract className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight text-ink">
            {ales?.denumire}
          </span>
          <span className="block truncate text-[10.5px] leading-tight text-faint">
            CUI {ales?.cui}{ales?.numar ? ` · nr. ${ales.numar}` : ""}
          </span>
        </span>
        {!singur && <Ic.jos className={`h-3.5 w-3.5 shrink-0 text-faint transition-transform ${deschis ? "rotate-180" : ""}`} />}
      </button>

      {deschis && !singur && (
        <>
          {/* Prinde apasarea din afara, ca lista sa se inchida fara un efect
              care asculta tot documentul. */}
          <button aria-label="Închide lista" onClick={() => setDeschis(false)} className="fixed inset-0 z-40 cursor-default" />
          <div
            role="listbox"
            className="rise absolute left-0 top-[calc(100%+6px)] z-50 max-h-[min(60vh,420px)] w-[min(90vw,380px)] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface-2 p-1.5 shadow-2xl scroll-slim"
          >
            {contracte.map(c => {
              const curent = c.id === ales?.id;
              return (
                <button
                  key={c.id}
                  role="option"
                  aria-selected={curent}
                  onClick={() => { alege(c.id); setDeschis(false); }}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    curent ? "bg-brand-dim" : "hover:bg-surface-3"
                  }`}
                >
                  <span className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${curent ? "text-brand-soft" : "text-transparent"}`}>
                    <Ic.bifa className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-tight text-ink">{c.denumire}</span>
                    <span className="block truncate text-[11px] leading-tight text-faint">
                      CUI {c.cui}{c.numar ? ` · nr. ${c.numar}` : ""}
                      {c.status === "suspendat" && " · suspendat"}
                    </span>
                  </span>
                </button>
              );
            })}
            <Link
              href="/panou/contracte"
              onClick={() => setDeschis(false)}
              className="mt-1 flex items-center gap-2 border-t border-line px-2.5 pb-1 pt-2.5 text-[12.5px] text-muted transition-colors hover:text-ink"
            >
              <Ic.plus className="h-3.5 w-3.5" /> Contract nou
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
