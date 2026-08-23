"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Eticheta, Gol, Rotitor, Schelet } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";
import { areRaportAi, cuMajuscula, stareDosar, verdictul, type DosarLunar } from "../dosar-lunar";
import PupitruCenzor from "../dosar/[id]/PupitruCenzor";

/**
 * Dosarul, ca loc de lucru.
 *
 * Aici NU se incarca si nu se administreaza luni — alea se fac la „Încarcă
 * documente", unde le e locul. Aici se deschide un dosar si se lucreaza in el:
 * documentele intr-o parte, constatarile in cealalta, si la final raportul
 * cenzorului, semnat.
 *
 * Ce adauga fata de adresa directa `/panou/dosar/<id>`: nu trebuie sa stii id-ul.
 * Alegi luna dintr-un rand de pastile si intri. Fara alegere, se deschide singura
 * luna care asteapta o decizie — aia e treaba de azi.
 */
export default function DosareClient() {
  const { ales } = useContract();

  const [lista, setLista] = useState<{ cheie: string; dosare: DosarLunar[] } | null>(null);
  const [alesId, setAlesId] = useState<string | null>(null);

  const contractId = ales?.id ?? "";
  const dosare = useMemo(
    () => (lista?.cheie === contractId ? lista.dosare : []),
    [lista, contractId],
  );
  const seIncarca = Boolean(contractId) && lista?.cheie !== contractId;

  useEffect(() => {
    if (!contractId) return;
    const opreste = new AbortController();
    fetch(`/api/panou/dosare?contractId=${encodeURIComponent(contractId)}`, { signal: opreste.signal })
      .then(r => (r.ok ? r.json() : { dosare: [] }))
      .catch(() => ({ dosare: [] }))
      .then(d => { if (!opreste.signal.aborted) setLista({ cheie: contractId, dosare: d?.dosare ?? [] }); });
    return () => opreste.abort();
  }, [contractId]);

  /**
   * Ce dosar se deschide cand nu ai ales nimic.
   *
   * Nu cel mai recent, ci cel care ASTEAPTA: o luna verificata, nesemnata, e
   * treaba de azi. Daca nu exista, cel mai recent verificat; daca nici atat,
   * primul din lista.
   */
  const implicit = useMemo(() => {
    const laCenzor = dosare.find(d => d.etapa === "revizuire");
    return laCenzor ?? dosare.find(d => areRaportAi(d)) ?? dosare[0] ?? null;
  }, [dosare]);

  // Derivat, nu pus cu `setState` intr-un efect: alegerea omului bate implicitul,
  // dar pana la ea implicitul se schimba singur cand se incarca lista.
  const deschis = dosare.find(d => d.id === alesId) ?? implicit;

  if (!ales) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">Dosare</h1>
        <Card className="mt-5 px-5 py-6">
          <p className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <Ic.info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
            Dosarele stau sub un contract. Nu există încă niciunul.
          </p>
          <Link href="/panou/contracte"
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
            <Ic.contract className="h-3.5 w-3.5" /> Adaugă un contract
          </Link>
        </Card>
      </div>
    );
  }

  if (seIncarca) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Schelet className="h-9 w-64" />
        <Schelet className="mt-4 h-[70vh]" />
      </div>
    );
  }

  if (!deschis) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">Dosare</h1>
        <Card className="mt-5">
          <Gol
            pictograma={<Ic.dosar className="h-5 w-5" />}
            titlu="Niciun dosar deschis"
            text={`Pentru ${ales.denumire} nu s-a deschis încă nicio lună. Dosarul se deschide singur la prima încărcare de documente.`}
            actiune={
              <Link href="/panou/incarcare"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
                <Ic.sus className="h-3.5 w-3.5" /> Încarcă documente
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Rândul de luni. Sticky, ca să poți trece dintr-o lună în alta fără să
          urci înapoi prin tot pupitrul. */}
      {dosare.length > 1 && (
        <div className="sticky top-[53px] z-20 border-b border-line bg-app/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2.5 scroll-slim sm:px-6 lg:px-8">
            {dosare.map(d => {
              const curent = d.id === deschis.id;
              const stare = stareDosar(d);
              const v = areRaportAi(d) ? verdictul(d) : null;
              return (
                <button
                  key={d.id}
                  onClick={() => setAlesId(d.id)}
                  title={stare.text}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    curent
                      ? "border-brand/40 bg-brand-dim text-ink"
                      : "border-line-strong text-muted hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    d.etapa === "semnat" ? "bg-ok"
                      : d.etapa === "revizuire" ? "bg-warn"
                        : stare.inLucru ? "bg-brand" : "bg-muted"
                  }`} />
                  {cuMajuscula(d.luna)} {d.an}
                  {v && <span className="tnum text-faint">{Math.round(d.scor ?? 0)}%</span>}
                  {stare.inLucru && <Rotitor className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Luna care nu a fost încă verificată nu are ce arăta în pupitru. */}
      {!areRaportAi(deschis) && deschis.stareEtapa !== "in_lucru" ? (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {cuMajuscula(deschis.luna)} {deschis.an}
          </h1>
          <Card className="mt-5 px-5 py-6">
            <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-muted">
              <Eticheta ton={stareDosar(deschis).ton}>{stareDosar(deschis).text}</Eticheta>
              {deschis.fisiere.length} {deschis.fisiere.length === 1 ? "document în dosar" : "documente în dosar"}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-faint">
              Luna aceasta nu a trecut încă prin verificare, deci nu are constatări de analizat.
              Verificarea se pornește din meniul lunii, la „Încarcă documente”.
            </p>
            <Link href="/panou/incarcare"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
              Mergi la documentele lunii <Ic.dreapta className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      ) : (
        // Pupitrul isi aduce singur datele; cheia il face sa reporneasca curat la
        // schimbarea lunii, in loc sa amestece constatarile a doua dosare.
        <PupitruCenzor key={deschis.id} dosarId={deschis.id} />
      )}
    </>
  );
}
