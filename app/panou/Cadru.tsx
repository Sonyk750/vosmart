"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Ic } from "@/app/components/icoane";
import { ProviderContract, SelectorContract, type ContractScurt } from "./ContractContext";

/**
 * Latimea meniului, tinuta in `localStorage`.
 *
 * E o stare din AFARA lui React, asa ca se citeste ca atare, nu cu un efect care
 * face `setState` la prima randare — ala ar produce o a doua randare inainte sa
 * se aseze prima. Bonus: doua taburi deschise raman sincronizate, fiindca
 * `storage` anunta si celelalte ferestre.
 */
const CHEIE_LATIME = "vosmart:meniu-restrans";
const ascultatori = new Set<() => void>();

function aboneaza(anunta: () => void) {
  ascultatori.add(anunta);
  window.addEventListener("storage", anunta);
  return () => {
    ascultatori.delete(anunta);
    window.removeEventListener("storage", anunta);
  };
}

function citesteLatime(): boolean {
  try {
    return localStorage.getItem(CHEIE_LATIME) === "1";
  } catch {
    // Fereastra privata sau browser cu stocarea oprita: meniul ramane extins.
    return false;
  }
}

/** Pe server nu exista `localStorage`; pornim de la meniul extins. */
const latimeLaServer = () => false;

function scrieLatime(restrans: boolean) {
  try {
    localStorage.setItem(CHEIE_LATIME, restrans ? "1" : "0");
  } catch { /* la fel: nu putem tine minte, dar putem functiona */ }
  ascultatori.forEach(anunta => anunta());
}

/**
 * Meniul de lucru al firmei.
 *
 * E organizat pe TREABA, nu pe tipuri de fisiere. Grupul „Lucru" e ce faci in
 * fiecare zi, „Verificare" e unde se produce raportul, „Administrare" e ce
 * atingi o data pe luna. Un meniu plat cu sapte intrari egale nu spune nimic
 * despre unde sa te uiti intai.
 *
 * Numerele din dreptul intrarilor nu sunt decor: arata cate dosare asteapta
 * chiar acolo. Cine deschide aplicatia dimineata trebuie sa vada de unde sa
 * apuce, fara sa intre in fiecare sectiune ca sa afle ca e goala.
 */

export type Numaratori = {
  deVerificat: number;
  laExpert: number;
};

type Intrare = {
  cale: string;
  eticheta: string;
  pictograma: React.ComponentType<{ className?: string }>;
  numar?: keyof Numaratori;
  /** Ton pentru numar: „warn" cand asteapta pe cineva anume. */
  ton?: "brand" | "warn";
  doarProprietar?: boolean;
  /** Doar contul de service (vezi lib/service-acces). Decis pe server. */
  doarService?: boolean;
};

type Grup = { titlu: string; intrari: Intrare[] };

const GRUPURI: Grup[] = [
  {
    titlu: "Lucru",
    intrari: [
      { cale: "/panou", eticheta: "Dashboard", pictograma: Ic.panou },
      { cale: "/panou/flux", eticheta: "Flux lunar", pictograma: Ic.flux },
      { cale: "/panou/incarcare", eticheta: "Încarcă documente", pictograma: Ic.sus },
    ],
  },
  {
    titlu: "Verificare",
    intrari: [
      { cale: "/panou/rapoarte-ai", eticheta: "Rapoarte AI", pictograma: Ic.scanteie, numar: "deVerificat", ton: "brand" },
      { cale: "/panou/rapoarte-expert", eticheta: "Rapoarte expert", pictograma: Ic.semnatura, numar: "laExpert", ton: "warn" },
      // Dosarele stau dupa rapoarte, nu langa incarcare: aici se lucreaza cu
      // luna intreaga — inventar, verificare, stergere — nu se arunca fisiere.
      { cale: "/panou/dosare", eticheta: "Dosare", pictograma: Ic.dosar },
    ],
  },
  {
    titlu: "Administrare",
    intrari: [
      { cale: "/panou/contracte", eticheta: "Contracte", pictograma: Ic.contract },
      { cale: "/panou/utilizatori", eticheta: "Utilizatori", pictograma: Ic.utilizatori, doarProprietar: true },
      // Caietul de service sta la capatul administrarii: e o unealta de
      // intretinere, nu un ecran de lucru zilnic. Il vede un singur cont.
      { cale: "/panou/service", eticheta: "Caiet de service", pictograma: Ic.cheie, doarService: true },
    ],
  },
];

export default function Cadru({
  utilizator, numaratori, contracte, esteService, children,
}: {
  utilizator: { nume: string; email: string; rol: string };
  /** Contul de service — decis pe server, in layout: regula tine de `crypto`. */
  esteService?: boolean;
  numaratori: Numaratori;
  /** Contractele pe care le poate lucra omul asta. Vezi `ContractContext`. */
  contracte: ContractScurt[];
  children: React.ReactNode;
}) {
  const cale = usePathname();
  const restrans = useSyncExternalStore(aboneaza, citesteLatime, latimeLaServer);
  const [sertarDeschis, setSertarDeschis] = useState(false);
  const proprietar = utilizator.rol === "admin";

  const comutaLatime = () => scrieLatime(!restrans);

  // Sertarul de pe telefon se inchide la apasarea pe link, nu dintr-un efect
  // care urmareste calea: aici stim de ce se inchide, iar acolo doar ghiceam.
  const inchideSertarul = () => setSertarDeschis(false);

  const activ = (c: string) => (c === "/panou" ? cale === "/panou" : cale.startsWith(c));

  const continut = (
    <>
      <div className={`flex items-center gap-2 border-b border-line px-3 py-3 ${restrans ? "justify-center" : ""}`}>
        <Link href="/panou" className="flex min-w-0 items-center gap-2.5">
          <Image src="/logo-vosmart.png" alt="VoSmart" width={64} height={28}
            className="h-auto shrink-0" style={{ mixBlendMode: "screen", width: restrans ? "30px" : "62px" }} />
        </Link>
        {!restrans && (
          <button onClick={comutaLatime} title="Restrânge meniul"
            className="ml-auto hidden rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink lg:block">
            <Ic.panoulateral className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 scroll-slim">
        {GRUPURI.map(grup => {
          const intrari = grup.intrari.filter(i =>
            (!i.doarProprietar || proprietar) && (!i.doarService || esteService));
          if (intrari.length === 0) return null;
          return (
            <div key={grup.titlu} className="mb-4 last:mb-0">
              {!restrans && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {grup.titlu}
                </p>
              )}
              <ul className="space-y-0.5">
                {intrari.map(i => {
                  const Pict = i.pictograma;
                  const esteActiv = activ(i.cale);
                  const n = i.numar ? numaratori[i.numar] : 0;
                  return (
                    <li key={i.cale}>
                      <Link
                        href={i.cale}
                        onClick={inchideSertarul}
                        title={restrans ? i.eticheta : undefined}
                        aria-current={esteActiv ? "page" : undefined}
                        className={`relative flex items-center gap-2.5 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
                          restrans ? "justify-center px-2" : "px-2.5"
                        } ${
                          esteActiv
                            ? "bg-brand-dim text-ink"
                            : "text-muted hover:bg-surface-3 hover:text-ink"
                        }`}
                      >
                        {esteActiv && (
                          <span aria-hidden className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-brand" />
                        )}
                        <Pict className={`h-[17px] w-[17px] shrink-0 ${esteActiv ? "text-brand-soft" : ""}`} />
                        {!restrans && <span className="flex-1 truncate">{i.eticheta}</span>}
                        {n > 0 && (
                          <span
                            className={`tnum shrink-0 rounded-full text-[10.5px] font-semibold leading-none ${
                              restrans
                                ? "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center px-1"
                                : "px-1.5 py-1"
                            } ${i.ton === "warn" ? "bg-warn text-app" : "bg-brand text-white"}`}
                          >
                            {n}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-2">
        {restrans ? (
          <div className="flex flex-col items-center gap-1">
            <button onClick={comutaLatime} title="Extinde meniul"
              className="rounded-md p-2 text-faint transition-colors hover:bg-surface-3 hover:text-ink">
              <Ic.panoulateral className="h-4 w-4" />
            </button>
            <FormularIesire restrans />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-4 text-[11px] font-semibold text-muted">
                {initiale(utilizator.nume || utilizator.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink">{utilizator.nume || utilizator.email}</span>
                <span className="block truncate text-[11px] text-faint">
                  {proprietar ? "Proprietar" : "Cenzor"}
                </span>
              </span>
            </div>
            <FormularIesire />
          </>
        )}
      </div>
    </>
  );

  return (
    <ProviderContract contracte={contracte}>
      {/* Sertarul de pe telefon */}
      {sertarDeschis && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Închide meniul" onClick={() => setSertarDeschis(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <aside className="rise absolute inset-y-0 left-0 flex w-[248px] flex-col border-r border-line bg-surface-1">
            {continut}
          </aside>
        </div>
      )}

      {/* Meniul fix, pe ecrane mari */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface-1 transition-[width] duration-200 lg:flex ${
          restrans ? "w-[60px]" : "w-[240px]"
        }`}
      >
        {continut}
      </aside>

      {/* Zona de continut se muta odata cu meniul. Marginea sta aici, nu in
          fiecare pagina: altfel fiecare ecran nou ar trebui sa-si aminteasca
          singur cat de lat e meniul, si primul care uita iese strambat. */}
      <div className={`transition-[padding] duration-200 ${restrans ? "lg:pl-[60px]" : "lg:pl-[240px]"}`}>
        {/* Bara de sus. Contractul ales sta AICI, nu in fiecare ecran: se alege
            o data si ramane ales peste tot, si nu mai apar doua casute care
            spun lucruri diferite despre aceeasi intrebare. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-app/85 px-3 py-2.5 backdrop-blur-xl sm:px-6">
          <button onClick={() => setSertarDeschis(true)} aria-label="Deschide meniul"
            className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-ink lg:hidden">
            <Ic.meniu className="h-5 w-5" />
          </button>
          <Image src="/logo-vosmart.png" alt="VoSmart" width={56} height={24}
            className="h-auto shrink-0 lg:hidden" style={{ mixBlendMode: "screen", width: "54px" }} />
          <SelectorContract />
        </header>
        <main className="min-h-[calc(100vh-53px)]">{children}</main>
      </div>
    </ProviderContract>
  );
}

function FormularIesire({ restrans }: { restrans?: boolean }) {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
      title={restrans ? "Ieșire" : undefined}
      className={`flex items-center gap-2.5 rounded-lg py-2 text-[13px] text-faint transition-colors hover:bg-surface-3 hover:text-ink ${
        restrans ? "justify-center px-2" : "w-full px-2.5"
      }`}
    >
      <Ic.iesire className="h-4 w-4 shrink-0" />
      {!restrans && "Ieșire"}
    </button>
  );
}

function initiale(text: string): string {
  const bucati = text.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (bucati[0]?.[0] ?? "?").toUpperCase() + (bucati[1]?.[0]?.toUpperCase() ?? "");
}

/** Latimea meniului, ca zona de continut sa stie cat spatiu are. */
export const LATIME_MENIU = { extins: 240, restrans: 60 };
