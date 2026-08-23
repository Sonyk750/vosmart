"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPURI, lipsuri, eticheta as etichetaTip } from "@/lib/cenzorat/documente";
import { formatul } from "@/lib/cenzorat/formate";
import { Bara, Buton, Card, Eticheta, Gol, Rotitor, Schelet } from "@/app/components/ui";
import { claseCamp, dataRo } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";
import {
  cantitate, cuMajuscula, deCitit, kb, stareDosar,
  type DosarLunar as Dosar, type FisierDinDosar,
} from "../dosar-lunar";

/**
 * Dosarele lunare ale contractului.
 *
 * Statea in ecranul de incarcare, si nu era locul lui: acolo se ARUNCA documente,
 * aici se LUCREAZA cu lunile — vezi ce e in fiecare, scoti ce a intrat gresit,
 * scoti inventarul pe hartie, trimiti la verificare, stergi luna deschisa gresit.
 * Doua treburi diferite, doua ecrane.
 */
export default function DosareClient({ intocmitDe }: { intocmitDe: string }) {
  const { ales } = useContract();
  const router = useRouter();

  const [deschis, setDeschis] = useState<string | null>(null);
  const [modSters, setModSters] = useState(false);
  const [lucreaza, setLucreaza] = useState<string | null>(null);
  const [eroare, setEroare] = useState("");
  const [izbanda, setIzbanda] = useState("");

  const [lista, setLista] = useState<{ cheie: string; dosare: Dosar[] } | null>(null);
  const [reincarca, setReincarca] = useState(0);

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

  const totalContract = useMemo(() => {
    const toate = dosare.flatMap(d => d.fisiere);
    return { documente: toate.length, ...cantitate(toate) };
  }, [dosare]);

  async function porneste(dosar: Dosar) {
    if (lucreaza) return;
    setLucreaza(dosar.id);
    setEroare("");
    setIzbanda("");
    try {
      const r = await fetch(`/api/panou/dosare/${dosar.id}/verifica`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Verificarea nu a putut fi pornită.");
      setIzbanda(`Verificarea dosarului pe ${dosar.luna} ${dosar.an} a pornit. Durează în jur de un minut.`);
      setReincarca(n => n + 1);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Verificarea nu a putut fi pornită.");
    } finally {
      setLucreaza(null);
    }
  }

  async function stergeDocument(fisier: FisierDinDosar) {
    if (lucreaza) return;
    setLucreaza(fisier.id);
    setEroare("");
    setIzbanda("");
    try {
      const r = await fetch(`/api/panou/fisiere/${fisier.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Documentul nu a putut fi șters.");
      setIzbanda(`„${fisier.numeFisier}" a fost scos din dosar.`);
      setReincarca(n => n + 1);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Documentul nu a putut fi șters.");
    } finally {
      setLucreaza(null);
    }
  }

  /**
   * Inventarul lunii, pe hartie.
   *
   * `@react-pdf/renderer` e o dependinta grea; se aduce doar la apasare, ca sa nu
   * intre in pachetul cu care porneste ecranul.
   */
  async function salveazaInventarul(dosar: Dosar) {
    if (!ales) return;
    setEroare("");
    try {
      const { descarcaInventarul } = await import("@/app/components/InventarPDF");
      await descarcaInventarul({
        contract: { denumire: ales.denumire, cui: ales.cui, numar: ales.numar },
        luna: dosar.luna,
        an: dosar.an,
        fisiere: dosar.fisiere,
        lipsa: lipsuri(dosar.fisiere.map(f => f.tip)),
        intocmitDe,
      });
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Inventarul nu a putut fi generat.");
    }
  }

  /**
   * Sterge dosarul unei luni, cu tot ce e in el.
   *
   * Se intampla cand luna a fost deschisa gresit. Confirmarea e cu numarul de
   * documente in ea: „18 documente" opreste mana mai bine decat „ești sigur?".
   */
  async function stergeDosarul(dosar: Dosar) {
    const cate = dosar.fisiere.length;
    const sigur = window.confirm(
      `Se șterge dosarul pe ${dosar.luna} ${dosar.an}, cu tot ce e în el`
      + (cate ? `: ${cate} ${cate === 1 ? "document" : "documente"}, inventarul și verificarea.` : ".")
      + "\n\nȘtergerea e definitivă.",
    );
    if (!sigur) return;

    setLucreaza(dosar.id);
    setEroare("");
    setIzbanda("");
    try {
      const r = await fetch(`/api/panou/dosare/${dosar.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Dosarul nu a putut fi șters.");
      setIzbanda(`Dosarul pe ${dosar.luna} ${dosar.an} a fost șters.`);
      setDeschis(null);
      setReincarca(n => n + 1);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Dosarul nu a putut fi șters.");
    } finally {
      setLucreaza(null);
    }
  }

  /**
   * „Adaugă documente" din meniul unei luni.
   *
   * Incarcarea traieste in alt ecran, deci trecem acolo cu luna deja aleasa —
   * altfel omul ar ajunge pe un ecran gol si ar trebui sa o caute din nou.
   */
  function adaugaLa(dosar: Dosar) {
    router.push(`/panou/incarcare?luna=${encodeURIComponent(dosar.luna)}&an=${dosar.an}`);
  }

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Dosare</h1>
          <p className="mt-1 text-[13px] text-faint">
            Lunile contractului <span className="text-muted">{ales.denumire}</span>, cu tot ce s-a strâns în ele.
          </p>
        </div>
        <Link href="/panou/incarcare"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
          <Ic.sus className="h-3.5 w-3.5" /> Încarcă documente
        </Link>
      </div>

      {eroare && (
        <Card className="mt-4 border-bad/30 bg-bad-dim/50 px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-bad">
            <Ic.alerta className="mt-0.5 h-4 w-4 shrink-0" /> {eroare}
          </p>
        </Card>
      )}
      {izbanda && (
        <Card className="rise mt-4 border-ok/30 bg-ok-dim/40 px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-ok">
            <Ic.bifa className="mt-0.5 h-4 w-4 shrink-0" /> {izbanda}
          </p>
        </Card>
      )}

      <div className="mt-7">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Dosarele lunare</h2>
          {dosare.length > 0 && (
            <p className="tnum text-[12px] text-faint">
              {dosare.length} {dosare.length === 1 ? "lună" : "luni"}
              {" · "}{totalContract.documente} {totalContract.documente === 1 ? "document" : "documente"}
              {totalContract.documente > 0 && (
                totalContract.strans > 256 * 1024
                  ? ` · ${kb(totalContract.primit)} primite → ${kb(totalContract.pastrat)} pe server`
                  : ` · ${kb(totalContract.pastrat)} pe server`
              )}
            </p>
          )}
        </div>

        {seIncarca ? (
          <div className="space-y-2">
            <Schelet className="h-[74px]" />
            <Schelet className="h-[74px]" />
          </div>
        ) : dosare.length === 0 ? (
          <Card>
            <Gol
              pictograma={<Ic.dosar className="h-5 w-5" />}
              titlu="Nicio lună începută"
              text="Alege perioada de mai sus și încarcă primele documente. Dosarul lunii se deschide singur."
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {dosare.map(d => (
              <RandLuna
                key={d.id}
                dosar={d}
                peInventar={() => salveazaInventarul(d)}
                deschis={deschis === d.id}
                modSters={deschis === d.id && modSters}
                lucreaza={lucreaza}
                peComuta={(sters: boolean) => {
                  const acelasi = deschis === d.id;
                  setDeschis(acelasi && modSters === sters ? null : d.id);
                  setModSters(sters);
                }}
                peAdauga={() => adaugaLa(d)}
                peCorectat={() => setReincarca(n => n + 1)}
                peStergereDosar={() => stergeDosarul(d)}
                pePornire={() => porneste(d)}
                peStergere={stergeDocument}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- UN RÂND */

function RandLuna({
  dosar, deschis, modSters, lucreaza, peComuta, peAdauga, pePornire, peStergere, peStergereDosar,
  peInventar, peCorectat,
}: {
  dosar: Dosar;
  /** Scoate inventarul lunii pe hartie. */
  peInventar: () => void;
  deschis: boolean;
  modSters: boolean;
  lucreaza: string | null;
  peComuta: (modSters: boolean) => void;
  peAdauga: () => void;
  pePornire: () => void;
  peStergere: (f: FisierDinDosar) => void;
  peStergereDosar: () => void;
  /** Dupa o corectie, lista se aduce din nou de la server. */
  peCorectat: () => void;
}) {
  const [meniu, setMeniu] = useState(false);
  const stare = stareDosar(dosar);
  const cat = cantitate(dosar.fisiere);
  const semnat = dosar.etapa === "semnat";

  const lipsa = useMemo(() => lipsuri(dosar.fisiere.map(f => f.tip)), [dosar.fisiere]);
  const nou = deCitit(dosar);

  const actiune = (fn: () => void) => () => { setMeniu(false); fn(); };

  return (
    <li>
      {/* Fara `overflow-hidden` pe card: meniul „Acțiuni" e pozitionat absolut si
          iese in afara lui, iar orice stramos care taie continutul il reteaza —
          exact asa se vedea meniul pe jumatate. Taierea ramane doar pe panoul
          desfacut, unde chiar e nevoie de ea pentru colturile de jos. */}
      <Card>
        {/* ------------------------------------------------------ capul */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            onClick={() => peComuta(false)}
            aria-expanded={deschis}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-soft">
                {dosar.luna.slice(0, 3)}
              </span>
              <span className="tnum text-[11px] leading-none text-faint">{dosar.an}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-ink">
                {cuMajuscula(dosar.luna)} {dosar.an}
              </span>
              <span className="block truncate text-[11.5px] text-faint">
                {dosar.fisiere.length} {dosar.fisiere.length === 1 ? "document" : "documente"}
                {dosar.fisiere.length > 0 && (
                  cat.strans > 256 * 1024
                    ? ` · ${kb(cat.primit)} primite → ${kb(cat.pastrat)} pe server`
                    : ` · ${kb(cat.pastrat)}`
                )}
                {lipsa.length > 0 && ` · lipsesc ${lipsa.length}`}
              </span>
            </span>
            <Ic.jos className={`h-4 w-4 shrink-0 text-faint transition-transform ${deschis ? "rotate-180" : ""}`} />
          </button>

          <Eticheta ton={stare.ton}>
            {stare.inLucru && <Rotitor className="h-3 w-3" />}
            {stare.text}
          </Eticheta>

          {/* ---------------------------------------------------- meniul */}
          <div className="relative shrink-0">
            <Buton fel="moale" marime="mic" onClick={() => setMeniu(v => !v)} aria-haspopup="menu" aria-expanded={meniu}>
              Acțiuni <Ic.jos className={`h-3.5 w-3.5 transition-transform ${meniu ? "rotate-180" : ""}`} />
            </Buton>

            {meniu && (
              <>
                <button aria-label="Închide meniul" onClick={() => setMeniu(false)}
                  className="fixed inset-0 z-40 cursor-default" />
                <div role="menu"
                  className="rise absolute right-0 top-[calc(100%+6px)] z-50 w-[236px] rounded-[var(--radius-card)] border border-line bg-surface-2 p-1.5 shadow-2xl">
                  <ElementMeniu pictograma={<Ic.sus className="h-3.5 w-3.5" />} dezactivat={semnat}
                    peApasare={actiune(peAdauga)}>
                    Adaugă documente
                  </ElementMeniu>
                  <ElementMeniu pictograma={<Ic.dosar className="h-3.5 w-3.5" />}
                    peApasare={actiune(() => peComuta(false))}>
                    Rezumat
                  </ElementMeniu>
                  <ElementMeniu pictograma={<Ic.cos className="h-3.5 w-3.5" />} dezactivat={semnat || dosar.fisiere.length === 0}
                    peApasare={actiune(() => peComuta(true))}>
                    Șterge documente
                  </ElementMeniu>
                  <ElementMeniu pictograma={<Ic.descarca className="h-3.5 w-3.5" />}
                    dezactivat={dosar.fisiere.length === 0}
                    peApasare={actiune(peInventar)}>
                    Salvează inventarul (PDF)
                  </ElementMeniu>
                  <ElementMeniu pictograma={<Ic.scanteie className="h-3.5 w-3.5" />}
                    dezactivat={semnat || dosar.fisiere.length === 0 || stare.inLucru || nou.cate === 0}
                    peApasare={actiune(pePornire)}>
                    {nou.cate === 0 ? "Totul e deja verificat"
                      : nou.tot ? `Trimite la verificare AI (${nou.cate})`
                        : `Verifică cele ${nou.cate} documente noi`}
                  </ElementMeniu>
                  <div className="my-1 border-t border-line" />
                  <ElementMeniu pictograma={<Ic.cos className="h-3.5 w-3.5" />} dezactivat={semnat}
                    peApasare={actiune(peStergereDosar)}>
                    Șterge dosarul lunii
                  </ElementMeniu>
                  <div className="my-1 border-t border-line" />
                  <Link href={`/panou/dosar/${dosar.id}`} role="menuitem" onClick={() => setMeniu(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink">
                    <Ic.balanta className="h-3.5 w-3.5" /> Deschide dosarul
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* bara etapei */}
        <div className="px-4 pb-3">
          <Bara procent={stare.procent} ton={stare.ton} inLucru={stare.inLucru} />
        </div>

        {/* ------------------------------------------------- ce e înăuntru */}
        {deschis && (
          <div className="rise overflow-hidden rounded-b-[var(--radius-card)] border-t border-line">
            {(dosar.rezumat || dosar.incredere !== null || dosar.scor !== null || dosar.fisiere.length > 0) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface-1 px-5 py-3">
                {dosar.fisiere.length > 0 && <Cifra eticheta="Primite" valoare={kb(cat.primit)} />}
                {dosar.fisiere.length > 0 && (
                  <Cifra
                    eticheta="Pe server"
                    valoare={cat.strans > 1024
                      ? `${kb(cat.pastrat)} (−${Math.round((cat.strans / cat.primit) * 100)}%)`
                      : kb(cat.pastrat)}
                  />
                )}
                {dosar.scor !== null && (
                  <Cifra eticheta="Scor" valoare={`${Math.round(dosar.scor)}%`} />
                )}
                {dosar.incredere !== null && (
                  <Cifra eticheta="Date găsite" valoare={`${dosar.incredere}%`} />
                )}
                {dosar.verdict && <Cifra eticheta="Verdict" valoare={dosar.verdict} />}
                <Cifra eticheta="Ultima mișcare" valoare={dataRo(dosar.updatedAt)} />
                {dosar.rezumat && (
                  <p className="w-full text-[12.5px] leading-relaxed text-muted">{dosar.rezumat}</p>
                )}
              </div>
            )}

            {dosar.fisiere.length === 0 ? (
              <p className="px-5 py-5 text-center text-[13px] text-faint">
                Dosarul e gol. Adaugă documentele lunii din meniul „Acțiuni”.
              </p>
            ) : (
              <>
                {modSters && (
                  <p className="flex items-start gap-2 border-b border-line bg-warn-dim/40 px-5 py-2.5 text-[12.5px] text-warn">
                    <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Apasă coșul din dreptul documentului ca să-l scoți din dosar. Ștergerea e definitivă.
                  </p>
                )}
                <ul className="divide-y divide-line">
                  {dosar.fisiere.map(f => (
                    <RandDocument
                      key={f.id}
                      fisier={f}
                      blocat={semnat}
                      lucreaza={lucreaza === f.id}
                      peStergere={() => peStergere(f)}
                      peCorectat={peCorectat}
                    />
                  ))}
                </ul>
              </>
            )}

            {lipsa.length > 0 && (
              <p className="flex items-start gap-2 border-t border-line px-5 py-2.5 text-[12px] text-faint">
                <Ic.info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Mai lipsește din dosar: {lipsa.join(", ")}.
              </p>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

function ElementMeniu({
  pictograma, dezactivat, peApasare, children,
}: {
  pictograma: React.ReactNode;
  dezactivat?: boolean;
  peApasare: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      disabled={dezactivat}
      onClick={peApasare}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="shrink-0 text-faint">{pictograma}</span>
      {children}
    </button>
  );
}

function Cifra({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <span className="block">
      <span className="block text-[10px] uppercase tracking-wider text-faint">{eticheta}</span>
      <span className="tnum block text-[13.5px] font-medium text-ink">{valoare}</span>
    </span>
  );
}


/* --------------------------------------------------- UN DOCUMENT DIN DOSAR */

/**
 * Un rand de inventar, cu doua fete: cum se citeste si cum se corecteaza.
 *
 * Modelul nimereste aproape mereu, dar „aproape" nu ajunge intr-un dosar care se
 * semneaza. Cenzorul schimba denumirea si tipul aici, in acelasi loc in care le
 * vede — nu intr-un alt ecran, cu documentul pierdut din ochi. Din clipa aceea
 * randul e al lui: `tipSursa` trece pe „om" si nicio recitire nu-l mai atinge.
 */
function RandDocument({
  fisier, blocat, lucreaza, peStergere, peCorectat,
}: {
  fisier: FisierDinDosar;
  /** Dosar semnat: se poate citi, nu se mai poate schimba. */
  blocat: boolean;
  lucreaza: boolean;
  peStergere: () => void;
  peCorectat: () => void;
}) {
  const [corecteaza, setCorecteaza] = useState(false);
  const [denumire, setDenumire] = useState(fisier.denumireAi ?? "");
  const [tip, setTip] = useState(fisier.tip);
  const [salveaza, setSalveaza] = useState(false);
  const [eroare, setEroare] = useState("");

  const format = formatul(fisier.numeFisier);

  async function salveazaCorectia() {
    if (salveaza) return;
    setSalveaza(true);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/fisiere/${fisier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip, denumire }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Corectura nu a putut fi salvată.");
      setCorecteaza(false);
      peCorectat();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Corectura nu a putut fi salvată.");
    } finally {
      setSalveaza(false);
    }
  }

  if (corecteaza) {
    return (
      <li className="rise bg-surface-1 px-5 py-3">
        <p className="mb-2.5 truncate text-[11.5px] text-faint">{fisier.numeFisier}</p>
        <div className="grid gap-2.5 sm:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Denumirea documentului</span>
            <input
              value={denumire}
              onChange={e => setDenumire(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") salveazaCorectia(); if (e.key === "Escape") setCorecteaza(false); }}
              placeholder="ex. Factură Apa Nova"
              autoFocus
              className={claseCamp}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Tipul</span>
            <select value={tip} onChange={e => setTip(e.target.value)} className={claseCamp}>
              {TIPURI.map(t => <option key={t.cheie} value={t.cheie}>{t.eticheta}</option>)}
              <option value="altele">Altele</option>
            </select>
          </label>
        </div>
        {eroare && <p className="mt-2 text-[12px] text-bad">{eroare}</p>}
        <div className="mt-3 flex items-center gap-2">
          <Buton fel="principal" marime="mic" incarca={salveaza} onClick={salveazaCorectia}>
            <Ic.bifa className="h-3.5 w-3.5" /> Salvează
          </Buton>
          <Buton fel="fantoma" marime="mic" onClick={() => setCorecteaza(false)}>Renunță</Buton>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-2.5">
      <Ic.fisier className="h-4 w-4 shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        {/* Ce a citit modelul e numele principal. Tipul si numele fisierului stau
            dedesubt: felul documentului si de unde a venit, amandoua utile, dar
            niciunul nu e „cum se cheama documentul asta". */}
        <p className="truncate text-[13px] text-ink">
          {fisier.denumireAi || fisier.eticheta || etichetaTip(fisier.tip)}
        </p>
        <p className="truncate text-[11.5px] text-faint">
          {fisier.denumireAi && <span>{etichetaTip(fisier.tip)} · </span>}
          {fisier.numeFisier} · {fisier.optimizat && fisier.marimeOriginala
            ? `${kb(fisier.marimeOriginala)} → ${kb(fisier.marime)}`
            : kb(fisier.marime)}
          {!format?.citibilDeAi && " · nu intră în verificarea automată"}
        </p>
        {fisier.tipSursa === "nume" && (
          <p className="text-[11px] text-warn/80">
            nu a putut fi citit — tipul e ghicit din numele fișierului
          </p>
        )}
        {fisier.tipSursa === "om" && (
          <p className="text-[11px] text-ok/80">corectat de cenzor</p>
        )}
        {fisier.amprenta && (
          <p className="truncate font-mono text-[10px] text-faint/70"
            title={`sha256 al fișierului original: ${fisier.amprenta}`}>
            {fisier.optimizat ? "recodat · " : ""}amprentă {fisier.amprenta.slice(0, 16)}…
          </p>
        )}
      </div>

      {!blocat && (
        <button
          onClick={() => { setDenumire(fisier.denumireAi ?? ""); setTip(fisier.tip); setCorecteaza(true); }}
          title="Corectează denumirea și tipul"
          className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Ic.creion className="h-3.5 w-3.5" />
        </button>
      )}
      <a
        href={`/api/panou/fisiere/${fisier.id}?inline=1`}
        target="_blank" rel="noreferrer"
        title="Deschide documentul"
        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <Ic.cauta className="h-3.5 w-3.5" />
      </a>
      <a
        href={`/api/panou/fisiere/${fisier.id}`}
        title="Descarcă documentul"
        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <Ic.descarca className="h-3.5 w-3.5" />
      </a>
      {!blocat && (
        <button
          onClick={peStergere}
          disabled={lucreaza}
          title={`Scoate ${fisier.numeFisier} din dosar`}
          className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-bad-dim hover:text-bad disabled:opacity-40"
        >
          {lucreaza ? <Rotitor className="h-3.5 w-3.5" /> : <Ic.cos className="h-3.5 w-3.5" />}
        </button>
      )}
    </li>
  );
}
