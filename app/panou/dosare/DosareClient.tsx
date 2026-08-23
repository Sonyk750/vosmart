"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lipsuri } from "@/lib/cenzorat/documente";
import { Buton, Card, Eticheta, Gol, InelScor, Rotitor, Schelet } from "@/app/components/ui";
import { dataRo } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";
import {
  areRaportAi, constatariActive, cuMajuscula, kb, cantitate, raportAi, stareDosar, verdictul,
  type DosarLunar,
} from "../dosar-lunar";
import PupitruCenzor from "../dosar/[id]/PupitruCenzor";

/**
 * Dosarul, ca loc de lucru.
 *
 * Aici NU se incarca si nu se administreaza luni — alea se fac la „Încarcă
 * documente", unde le e locul. Aici se deschide o luna si se lucreaza in ea:
 * documentele intr-o parte, constatarile in cealalta, raportul cenzorului la
 * final.
 *
 * Totul sta INTR-UN CARD, cu numele lunii in cap si actiunile ei in dreapta.
 * Fara rama, pupitrul incepea direct cu un vizualizator de PDF si nu se vedea
 * unde esti si ce poti face acolo.
 */
export default function DosareClient({ intocmitDe }: { intocmitDe: string }) {
  const { ales } = useContract();

  const [lista, setLista] = useState<{ cheie: string; dosare: DosarLunar[] } | null>(null);
  const [alesId, setAlesId] = useState<string | null>(null);
  const [eroare, setEroare] = useState("");

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
   * Ce luna se deschide cand nu ai ales nimic.
   *
   * Nu cea mai recenta, ci cea care ASTEAPTA: o luna verificata si nesemnata e
   * treaba de azi. Daca nu exista, cea mai recenta verificata; daca nici atat,
   * prima din lista.
   */
  const implicit = useMemo(() => {
    const laCenzor = dosare.find(d => d.etapa === "revizuire");
    return laCenzor ?? dosare.find(d => areRaportAi(d)) ?? dosare[0] ?? null;
  }, [dosare]);

  // Derivat, nu pus cu `setState` intr-un efect: alegerea omului bate implicitul,
  // dar pana la ea implicitul se aseaza singur cand soseste lista.
  const deschis = dosare.find(d => d.id === alesId) ?? implicit;

  /* ------------------------------------------------------------- ecrane goale */

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
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        <Schelet className="h-[86px]" />
        <Schelet className="mt-3 h-[70vh]" />
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

  /* ------------------------------------------------------------------ cardul */

  const stare = stareDosar(deschis);
  const gata = areRaportAi(deschis);
  const v = gata ? verdictul(deschis) : null;
  const cat = cantitate(deschis.fisiere);
  const active = constatariActive(deschis);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      {dosare.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scroll-slim">
          {dosare.map(d => {
            const curent = d.id === deschis.id;
            const s = stareDosar(d);
            return (
              <button
                key={d.id}
                onClick={() => { setAlesId(d.id); setEroare(""); }}
                title={s.text}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  curent ? "border-brand/40 bg-brand-dim text-ink"
                    : "border-line-strong text-muted hover:bg-surface-3 hover:text-ink"
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  d.etapa === "semnat" ? "bg-ok"
                    : d.etapa === "revizuire" ? "bg-warn"
                      : s.inLucru ? "bg-brand" : "bg-muted"
                }`} />
                {cuMajuscula(d.luna)} {d.an}
                {areRaportAi(d) && <span className="tnum text-faint">{Math.round(d.scor ?? 0)}%</span>}
                {s.inLucru && <Rotitor className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}

      <Card className="overflow-visible">
        {/* ---------------------------------------------------- capul cardului */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-5 py-3.5">
          <span className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-brand-soft">
              {deschis.luna.slice(0, 3)}
            </span>
            <span className="tnum text-[11.5px] leading-none text-faint">{deschis.an}</span>
          </span>

          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold tracking-tight text-ink">
              Dosar {deschis.luna} {deschis.an}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-faint">
              <span>{deschis.fisiere.length} documente · {kb(cat.pastrat)}</span>
              <span>primit {dataRo(deschis.createdAt)}</span>
              {deschis.terminatLa && <span>verificat {dataRo(deschis.terminatLa)}</span>}
            </p>
          </div>

          <div className="flex-1" />

          {gata && v ? (
            <div className="flex items-center gap-3">
              <InelScor valoare={Math.round(deschis.scor ?? 0)} ton={v.ton} marime={54} />
              <div>
                <Eticheta ton={v.ton}>{v.eticheta}</Eticheta>
                <p className="mt-1 text-[11px] leading-tight text-faint">
                  {active.length} {active.length === 1 ? "constatare" : "constatări"} în calcul
                  {deschis.incredere !== null && ` · încredere date ${deschis.incredere}%`}
                </p>
              </div>
            </div>
          ) : (
            <Eticheta ton={stare.ton}>
              {stare.inLucru && <Rotitor className="h-3 w-3" />}
              {stare.text}
            </Eticheta>
          )}

          <MeniuDosar dosar={deschis} contract={ales} intocmitDe={intocmitDe} pePlangere={setEroare} />
        </div>

        {eroare && (
          <p className="flex items-start gap-2 border-b border-line bg-bad-dim/40 px-5 py-2.5 text-[12.5px] text-bad">
            <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {eroare}
          </p>
        )}

        {/* --------------------------------------------------------- conținutul */}
        {!gata && !stare.inLucru ? (
          <div className="px-5 py-6">
            <p className="text-[13px] leading-relaxed text-muted">
              Luna aceasta nu a trecut încă prin verificare, deci nu are constatări de analizat.
              Verificarea se pornește din meniul lunii, la „Încarcă documente”.
            </p>
            {lipsuri(deschis.fisiere.map(f => f.tip)).length > 0 && (
              <p className="mt-2 text-[12.5px] text-faint">
                Mai lipsește din dosar: {lipsuri(deschis.fisiere.map(f => f.tip)).join(", ")}.
              </p>
            )}
            <Link href="/panou/incarcare"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
              Mergi la documentele lunii <Ic.dreapta className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          // `key` face pupitrul sa reporneasca curat la schimbarea lunii; fara ea,
          // ar tine cateva clipe constatarile lunii de dinainte peste cele noi.
          <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            <PupitruCenzor key={deschis.id} dosarId={deschis.id} faraAntet />
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------- ACȚIUNILE LUNII */

/**
 * Ce se poate face cu dosarul deschis.
 *
 * Reluarea verificarii NU e aici, dinadins: costa bani reali, iar un buton in
 * capul ecranului se apasa din greseala. Ea sta in meniul lunii de la „Încarcă
 * documente", unde scrie si cate documente s-ar reciti.
 */
function MeniuDosar({
  dosar, contract, intocmitDe, pePlangere,
}: {
  dosar: DosarLunar;
  contract: { denumire: string; cui: string; numar: string | null };
  intocmitDe: string;
  pePlangere: (mesaj: string) => void;
}) {
  const [deschis, setDeschis] = useState(false);
  const [lucreaza, setLucreaza] = useState(false);
  const raport = raportAi(dosar);
  const semnat = dosar.reports.find(r => r.tip === "expert" && r.status === "publicat");

  async function inventarul() {
    setDeschis(false);
    setLucreaza(true);
    try {
      const { descarcaInventarul } = await import("@/app/components/InventarPDF");
      await descarcaInventarul({
        contract,
        luna: dosar.luna,
        an: dosar.an,
        fisiere: dosar.fisiere,
        lipsa: lipsuri(dosar.fisiere.map(f => f.tip)),
        intocmitDe,
      });
    } catch (e) {
      pePlangere(e instanceof Error ? e.message : "Inventarul nu a putut fi generat.");
    } finally {
      setLucreaza(false);
    }
  }

  const clasaIntrare =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink";

  return (
    <div className="relative shrink-0">
      <Buton fel="moale" marime="mic" incarca={lucreaza}
        onClick={() => setDeschis(v => !v)} aria-haspopup="menu" aria-expanded={deschis}>
        Acțiuni <Ic.jos className={`h-3.5 w-3.5 transition-transform ${deschis ? "rotate-180" : ""}`} />
      </Buton>

      {deschis && (
        <>
          <button aria-label="Închide meniul" onClick={() => setDeschis(false)}
            className="fixed inset-0 z-40 cursor-default" />
          <div role="menu"
            className="rise absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] rounded-[var(--radius-card)] border border-line bg-surface-2 p-1.5 shadow-2xl">
            <button role="menuitem" onClick={inventarul} className={clasaIntrare}>
              <Ic.descarca className="h-3.5 w-3.5 shrink-0 text-faint" /> Salvează inventarul (PDF)
            </button>

            {raport ? (
              <a href={`/raport/${raport.id}`} target="_blank" rel="noreferrer" role="menuitem"
                onClick={() => setDeschis(false)} className={clasaIntrare}>
                <Ic.raport className="h-3.5 w-3.5 shrink-0 text-faint" /> Raportul AI (PDF)
              </a>
            ) : (
              <span className={`${clasaIntrare} pointer-events-none opacity-45`}>
                <Ic.raport className="h-3.5 w-3.5 shrink-0" /> Raportul AI nu e încă gata
              </span>
            )}

            {semnat && (
              <a href={`/raport/${semnat.id}`} target="_blank" rel="noreferrer" role="menuitem"
                onClick={() => setDeschis(false)} className={clasaIntrare}>
                <Ic.semnatura className="h-3.5 w-3.5 shrink-0 text-faint" /> Raportul semnat
              </a>
            )}

            <div className="my-1 border-t border-line" />

            <Link
              href={`/panou/incarcare?luna=${encodeURIComponent(dosar.luna)}&an=${dosar.an}`}
              role="menuitem" onClick={() => setDeschis(false)} className={clasaIntrare}
            >
              <Ic.sus className="h-3.5 w-3.5 shrink-0 text-faint" /> Documentele lunii
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
