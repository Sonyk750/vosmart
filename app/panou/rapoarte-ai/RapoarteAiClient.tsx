"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SEVERITATI, type Severitate } from "@/lib/cenzorat/tipuri";
import { Bara, Buton, Card, Eticheta, Gol, InelScor, Rotitor, Schelet } from "@/app/components/ui";
import { dataRo, type Ton } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";
import {
  areRaportAi, constatariActive, cuMajuscula, raportAi, stareDosar, verdictul,
  type DosarLunar,
} from "../dosar-lunar";

/**
 * Rapoartele AI, luna cu luna.
 *
 * Ecranul de incarcare raspunde la „ce am primit"; asta raspunde la „ce a iesit".
 * Aceleasi luni, alt unghi: aici conteaza scorul, verdictul si constatarile pe
 * severitati, nu documentele.
 *
 * Nu e un ecran de citit si atat. Lunile care au documente dar n-au fost inca
 * verificate stau sus, cu butonul lor — de aici se porneste verificarea, fara sa
 * mai treci prin ecranul de incarcare.
 *
 * Ce NU face: nu arata constatarile una cate una. Acolo se lucreaza, iar locul
 * de lucru e pupitrul cenzorului; aici doar se vede unde sa intri.
 */

const SEVERITATI_ORDINE: Severitate[] = ["critica", "ridicata", "medie", "scazuta", "info"];

export default function RapoarteAiClient() {
  const { ales } = useContract();

  const [lista, setLista] = useState<{ cheie: string; dosare: DosarLunar[] } | null>(null);
  const [reincarca, setReincarca] = useState(0);
  const [lucreaza, setLucreaza] = useState<string | null>(null);
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
  }, [contractId, reincarca]);

  // Cat timp o verificare e in lucru, ecranul se uita din nou din cand in cand:
  // citirea se intampla pe server, dupa ce raspunsul a plecat.
  const inLucru = dosare.some(d => d.stareEtapa === "in_lucru");
  useEffect(() => {
    if (!inLucru) return;
    const ceas = setInterval(() => setReincarca(n => n + 1), 6000);
    return () => clearInterval(ceas);
  }, [inLucru]);

  async function porneste(d: DosarLunar) {
    if (lucreaza) return;
    setLucreaza(d.id);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/dosare/${d.id}/verifica`, { method: "POST" });
      const raspuns = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(raspuns.error || "Verificarea nu a putut fi pornită.");
      setReincarca(n => n + 1);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Verificarea nu a putut fi pornită.");
    } finally {
      setLucreaza(null);
    }
  }

  /* --------------------------------------------------------------- ecran */

  if (!ales) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">Rapoarte AI</h1>
        <Card className="mt-5 px-5 py-6">
          <p className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <Ic.info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
            Verificarea se face pe dosarul unei luni, iar dosarul stă sub un contract. Nu există
            încă niciun contract.
          </p>
          <Link href="/panou/contracte"
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
            <Ic.contract className="h-3.5 w-3.5" /> Adaugă un contract
          </Link>
        </Card>
      </div>
    );
  }

  const asteapta = dosare.filter(d => !areRaportAi(d) && d.fisiere.length > 0 && d.stareEtapa !== "in_lucru");
  const verificate = dosare.filter(d => areRaportAi(d) || d.stareEtapa === "in_lucru" || d.stareEtapa === "esuata");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold tracking-tight">Rapoarte AI</h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-faint">
        Verificarea automată a unei luni: regulile de cenzorat aplicate pe cifrele citite din
        documente. Raportul nu se semnează de aici — de aici se vede unde e de intrat.
      </p>

      {eroare && (
        <Card className="mt-4 border-bad/30 bg-bad-dim/50 px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-bad">
            <Ic.alerta className="mt-0.5 h-4 w-4 shrink-0" /> {eroare}
          </p>
        </Card>
      )}

      {seIncarca ? (
        <div className="mt-5 space-y-2">
          <Schelet className="h-[104px]" />
          <Schelet className="h-[104px]" />
        </div>
      ) : dosare.length === 0 ? (
        <Card className="mt-5">
          <Gol
            pictograma={<Ic.scanteie className="h-5 w-5" />}
            titlu="Nicio lună de verificat"
            text="Verificarea se face pe documentele unei luni. Începe prin a le încărca."
            actiune={
              <Link href="/panou/incarcare"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
                <Ic.sus className="h-3.5 w-3.5" /> Încarcă documente
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {asteapta.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[15px] font-semibold tracking-tight text-ink">
                Așteaptă verificarea
              </h2>
              <ul className="space-y-2">
                {asteapta.map(d => (
                  <li key={d.id}>
                    <Card className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <PastilaLuna dosar={d} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-ink">
                          {cuMajuscula(d.luna)} {d.an}
                        </p>
                        <p className="text-[11.5px] text-faint">
                          {d.fisiere.length} {d.fisiere.length === 1 ? "document" : "documente"} · nu s-a rulat încă
                        </p>
                      </div>
                      <Buton fel="principal" marime="mic" incarca={lucreaza === d.id} onClick={() => porneste(d)}>
                        {lucreaza !== d.id && <Ic.scanteie className="h-3.5 w-3.5" />}
                        Execută verificarea
                      </Buton>
                      <Link href={`/panou/dosar/${d.id}`}
                        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                        title="Deschide dosarul">
                        <Ic.dreapta className="h-4 w-4" />
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2.5 text-[15px] font-semibold tracking-tight text-ink">
              Verificate
            </h2>
            {verificate.length === 0 ? (
              <Card>
                <Gol
                  pictograma={<Ic.scanteie className="h-5 w-5" />}
                  titlu="Nicio verificare rulată"
                  text="Alege o lună de mai sus și apasă „Execută verificarea”. Durează în jur de un minut."
                />
              </Card>
            ) : (
              <ul className="space-y-2">
                {verificate.map(d => (
                  <RandRaport key={d.id} dosar={d} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- BUCATI */

function PastilaLuna({ dosar }: { dosar: DosarLunar }) {
  return (
    <span className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-soft">
        {dosar.luna.slice(0, 3)}
      </span>
      <span className="tnum text-[11px] leading-none text-faint">{dosar.an}</span>
    </span>
  );
}

function RandRaport({ dosar }: { dosar: DosarLunar }) {
  const stare = stareDosar(dosar);
  const esuat = dosar.stareEtapa === "esuata";
  const gata = areRaportAi(dosar);
  const v = verdictul(dosar);
  const active = constatariActive(dosar);

  // Increderea nu e decor: un scor mare pe date incomplete nu inseamna un dosar
  // curat, inseamna un dosar necitit. De aceea sta langa scor, nu ascunsa.
  const dateSubtiri = dosar.incredere !== null && dosar.incredere < 55;

  return (
    <li>
      <Card className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <PastilaLuna dosar={dosar} />

          {gata && (
            <InelScor
              valoare={Math.round(dosar.scor ?? 0)}
              ton={v.ton}
              marime={62}
              eticheta="scor"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
              {cuMajuscula(dosar.luna)} {dosar.an}
              {gata ? <Eticheta ton={v.ton}>{v.eticheta}</Eticheta> : (
                <Eticheta ton={stare.ton}>
                  {stare.inLucru && <Rotitor className="h-3 w-3" />}
                  {stare.text}
                </Eticheta>
              )}
            </p>

            {gata && (
              <p className="mt-1 text-[12px] leading-relaxed text-faint">
                {v.explicatie}
              </p>
            )}

            {esuat && dosar.rezumat && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-bad">{dosar.rezumat}</p>
            )}

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
              <span>{dosar.fisiere.length} documente</span>
              {dosar.incredere !== null && (
                <span className={dateSubtiri ? "text-warn" : undefined}>
                  {dosar.incredere}% din indicatori găsiți
                </span>
              )}
              {dosar.terminatLa && <span>verificat {dataRo(dosar.terminatLa)}</span>}
              {dosar.tokensIn !== null && (
                <span title="Costul rulării, la prețurile Opus 5">
                  ${((dosar.tokensIn / 1e6) * 5 + ((dosar.tokensOut ?? 0) / 1e6) * 25).toFixed(2)}
                </span>
              )}
            </p>

            {gata && active.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SEVERITATI_ORDINE.map(sev => {
                  const cate = active.filter(c => c.severitate === sev).length;
                  if (cate === 0) return null;
                  return (
                    <Eticheta key={sev} ton={SEVERITATI[sev].ton as Ton}>
                      {cate} {SEVERITATI[sev].eticheta.toLowerCase()}
                    </Eticheta>
                  );
                })}
              </div>
            )}
            {gata && active.length === 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ok">
                <Ic.bifa className="h-3.5 w-3.5" /> Nicio abatere semnalată
              </p>
            )}
          </div>

          {/* Un singur meniu, nu doua butoane.
              „Reia" statea la un clic distanta de o rulare de un dolar, si se
              apasa din greseala; verificarea se porneste acum din dosar, cu
              intrebare. Iar „Deschide" nu spunea ce deschide — dosarul sau
              raportul? — deci amandoua au intrat aici, cu numele lor. */}
          <MeniuRaport dosar={dosar} />
        </div>

        <div className="mt-3">
          <Bara procent={stare.procent} ton={gata ? v.ton : stare.ton} inLucru={stare.inLucru} />
        </div>

        {dateSubtiri && gata && (
          <p className="mt-2.5 flex items-start gap-2 text-[12px] leading-relaxed text-warn">
            <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Din documente s-au putut citi doar {dosar.incredere}% din indicatorii urmăriți.
            Un scor bun pe date incomplete nu înseamnă un dosar curat.
          </p>
        )}
      </Card>
    </li>
  );
}


/**
 * Ce se poate face cu o luna verificata.
 *
 * Doua drumuri, si se cheama pe nume: raportul, ca hartie de citit si tiparit;
 * dosarul, ca loc de lucru. Reluarea NU e aici — costa bani reali, iar un buton
 * langa un rand se apasa din greseala. Ea sta in meniul lunii, cu intrebare.
 */
function MeniuRaport({ dosar }: { dosar: DosarLunar }) {
  const [deschis, setDeschis] = useState(false);
  const raport = raportAi(dosar);
  const semnat = dosar.reports.find(r => r.tip === "expert" && r.status === "publicat");

  return (
    <div className="relative shrink-0">
      <Buton fel="moale" marime="mic" onClick={() => setDeschis(v => !v)} aria-haspopup="menu" aria-expanded={deschis}>
        Acțiuni <Ic.jos className={`h-3.5 w-3.5 transition-transform ${deschis ? "rotate-180" : ""}`} />
      </Buton>

      {deschis && (
        <>
          <button aria-label="Închide meniul" onClick={() => setDeschis(false)}
            className="fixed inset-0 z-40 cursor-default" />
          <div role="menu"
            className="rise absolute right-0 top-[calc(100%+6px)] z-50 w-[240px] rounded-[var(--radius-card)] border border-line bg-surface-2 p-1.5 shadow-2xl">
            {raport ? (
              <a
                href={`/raport/${raport.id}`} target="_blank" rel="noreferrer" role="menuitem"
                onClick={() => setDeschis(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Ic.descarca className="h-3.5 w-3.5" /> Descarcă raportul PDF
              </a>
            ) : (
              <span className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-faint opacity-50">
                <Ic.descarca className="h-3.5 w-3.5" /> Raportul nu e încă gata
              </span>
            )}

            {semnat && (
              <a
                href={`/raport/${semnat.id}`} target="_blank" rel="noreferrer" role="menuitem"
                onClick={() => setDeschis(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Ic.semnatura className="h-3.5 w-3.5" /> Raportul semnat
              </a>
            )}

            <div className="my-1 border-t border-line" />
            <Link
              href={`/panou/dosar/${dosar.id}`} role="menuitem" onClick={() => setDeschis(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <Ic.balanta className="h-3.5 w-3.5" /> Vezi dosarul
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
