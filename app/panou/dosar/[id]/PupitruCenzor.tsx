"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Buton, Camp, Card, CardCap, Eticheta, Gol, InelScor, Rotitor } from "@/app/components/ui";
import { claseCamp, dataRo, lei, Ton } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { SEVERITATI, Severitate } from "@/lib/cenzorat/tipuri";
import { eticheta as etichetaTip } from "@/lib/cenzorat/documente";

/**
 * Pupitrul de revizuire al cenzorului.
 *
 * Ecranul vechi ii dadea cenzorului un `<textarea>` cu un rezumat in text plat,
 * un buton „Draft AI" care pornea o a doua analiza fara sa vada documentele, si
 * un buton „Aprobă & Publică" care salva ce era in casuta. Nu putea deschide
 * niciun document si nu putea contesta nimic punctual.
 *
 * Aici cenzorul lucreaza asa cum lucreaza un cenzor: are documentul deschis in
 * stanga si constatarea in dreapta, cu cifrele pe care se sprijina. La fiecare
 * „resping", scorul se recalculeaza in fata lui. La final semneaza — si abia
 * atunci raportul pleaca spre asociatie.
 */

type Proba = { eticheta: string; valoare: string };
type Constatare = {
  id: string; cod: string; titlu: string; detaliu: string;
  severitate: Severitate; sursa: "regula" | "ai" | "cenzor";
  temei: string | null; probe: Proba[]; recomandare: string | null;
  stare: "deschisa" | "acceptata" | "respinsa"; notaCenzor: string | null;
};
type Scor = {
  valoare: number; verdict: string;
  defalcare: { severitate: Severitate; eticheta: string; numar: number; puncte: number }[];
  luateInCalcul: number; ignorate: number;
};
type Fisier = { id: string; numeFisier: string; eticheta: string; tip: string; mimeType: string; marime: number };

type Date_ = {
  dosar: { id: string; titlu: string; luna: string | null; an: number | null; etapa: string; stareEtapa: string; incredere: number | null; creatLa: string };
  contract: { id: string; denumire: string; cui: string; adresa: string | null; telefon: string | null; email: string | null; reprezentant: string | null } | null;
  extras: Record<string, never> | null;
  fisiere: Fisier[];
  constatari: Constatare[];
  scor: Scor;
  raport: { id: string; status: string; semnatDe: string | null; semnatLa: string | null } | null;
};

const TON_SEV: Record<Severitate, Ton> = {
  critica: "bad", ridicata: "risk", medie: "warn", scazuta: "info", info: "neutru",
};
const VERDICT: Record<string, { text: string; ton: Ton }> = {
  conform: { text: "Conform", ton: "ok" },
  observatii: { text: "Conform cu observații", ton: "info" },
  neconform: { text: "Neconform", ton: "warn" },
  grav: { text: "Deficiențe grave", ton: "bad" },
};
const SURSA: Record<string, string> = {
  regula: "verificare automată", ai: "citire AI", cenzor: "adăugată de cenzor",
};

export default function PupitruCenzor({ dosarId }: { dosarId: string }) {
  const [date, setDate] = useState<Date_ | null>(null);
  const [eroare, setEroare] = useState("");
  const [lucreaza, setLucreaza] = useState<string | null>(null);
  const [fisierDeschis, setFisierDeschis] = useState<Fisier | null>(null);
  const [adaugaDeschis, setAdaugaDeschis] = useState(false);
  const [semneaza, setSemneaza] = useState(false);
  const [confirmSemnare, setConfirmSemnare] = useState(false);
  const [concluzie, setConcluzie] = useState("");

  const adu = useCallback(async () => {
    const r = await fetch(`/api/panou/dosare/${dosarId}`);
    if (!r.ok) { setEroare("Dosarul nu a putut fi încărcat."); return; }
    const d: Date_ = await r.json();
    setDate(d);
    setFisierDeschis(f => f ?? d.fisiere.find(x => x.tip === "lista_plata") ?? d.fisiere[0] ?? null);
  }, [dosarId]);

  useEffect(() => {
    // Starea se aseaza in raspuns, nu in corpul efectului: altfel prima randare
    // e imediat urmata de a doua, inainte sa apuce sa se aseze.
    let activ = true;
    fetch(`/api/panou/dosare/${dosarId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: Date_ | null) => {
        if (!activ) return;
        if (!d) { setEroare("Dosarul nu a putut fi încărcat."); return; }
        setDate(d);
        setFisierDeschis(d.fisiere.find(x => x.tip === "lista_plata") ?? d.fisiere[0] ?? null);
      })
      .catch(() => { if (activ) setEroare("Dosarul nu a putut fi încărcat."); });
    return () => { activ = false; };
  }, [dosarId]);

  const semnat = date?.raport?.status === "publicat";

  async function schimba(id: string, modificare: Record<string, unknown>) {
    if (semnat) return;
    setLucreaza(id);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/constatari/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modificare),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDate(v => (v ? { ...v, constatari: d.constatari, scor: d.scor } : v));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Modificarea nu a fost salvată.");
    } finally {
      setLucreaza(null);
    }
  }

  async function semneazaRaportul() {
    setSemneaza(true);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/dosare/${dosarId}/semneaza`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluzie }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await adu();
      setConfirmSemnare(false);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Raportul nu a putut fi semnat.");
    } finally {
      setSemneaza(false);
    }
  }

  const grupate = useMemo(() => {
    if (!date) return { deDecis: [], acceptate: [], respinse: [] };
    return {
      deDecis: date.constatari.filter(c => c.stare === "deschisa"),
      acceptate: date.constatari.filter(c => c.stare === "acceptata"),
      respinse: date.constatari.filter(c => c.stare === "respinsa"),
    };
  }, [date]);

  if (!date) {
    return (
      <div className="flex items-center gap-3 px-6 py-16 text-muted">
        <Rotitor className="h-4 w-4" /> Se deschide dosarul…
      </div>
    );
  }

  const verdict = VERDICT[date.scor.verdict] ?? { text: date.scor.verdict, ton: "neutru" as Ton };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      {/* ------------------------------------------------------------ antet */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/panou/rapoarte-expert" className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-ink">
            <Ic.stanga className="h-3.5 w-3.5" /> Rapoarte expert
          </Link>
          <h1 className="text-[21px] font-semibold tracking-tight text-ink">{date.contract?.denumire ?? date.dosar.titlu}</h1>
          <p className="mt-0.5 text-[13px] text-faint">
            {date.dosar.luna} {date.dosar.an}
            {date.contract?.cui && ` · CUI ${date.contract.cui}`}
            {` · dosar primit ${dataRo(date.dosar.creatLa)}`}
          </p>
        </div>

        <Card className="flex items-center gap-4 px-4 py-3">
          <InelScor valoare={date.scor.valoare} ton={verdict.ton} marime={64} />
          <div>
            <Eticheta ton={verdict.ton}>{verdict.text}</Eticheta>
            <p className="mt-1.5 text-[11.5px] leading-tight text-faint">
              {date.scor.luateInCalcul} {date.scor.luateInCalcul === 1 ? "constatare" : "constatări"} în calcul
              {date.scor.ignorate > 0 && ` · ${date.scor.ignorate} respinse`}
            </p>
            {date.dosar.incredere !== null && (
              <p className="tnum mt-0.5 text-[11.5px] text-faint" title="Cât din datele urmărite s-au găsit în documente.">
                încredere date {date.dosar.incredere}%
              </p>
            )}
          </div>
        </Card>
      </div>

      {semnat && (
        <Card className="mb-4 border-ok/30 bg-ok-dim/40 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] text-ok">
            <Ic.semnatura className="h-4 w-4 shrink-0" />
            Raport semnat de <strong className="font-semibold">{date.raport?.semnatDe}</strong> la {dataRo(date.raport?.semnatLa)}. Nu mai poate fi modificat.
          </p>
        </Card>
      )}

      {date.dosar.incredere !== null && date.dosar.incredere < 55 && !semnat && (
        <Card className="mb-4 border-warn/30 bg-warn-dim/40 px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-warn">
            <Ic.alerta className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Din documente s-au putut citi doar <strong className="tnum">{date.dosar.incredere}%</strong> din
              indicatorii urmăriți. Un scor bun pe date incomplete nu înseamnă un dosar curat — verificați
              manual înainte de semnare.
            </span>
          </p>
        </Card>
      )}

      {eroare && (
        <Card className="mb-4 border-bad/30 bg-bad-dim/40 px-4 py-3">
          <p className="text-[13px] text-bad">{eroare}</p>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ------------------------------------------------- documentul */}
        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2 scroll-slim">
              {date.fisiere.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFisierDeschis(f)}
                  title={f.numeFisier}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    fisierDeschis?.id === f.id ? "bg-brand text-white" : "text-muted hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  {f.eticheta || etichetaTip(f.tip)}
                </button>
              ))}
            </div>

            {fisierDeschis ? (
              <div className="bg-paper-2">
                <iframe
                  key={fisierDeschis.id}
                  src={`/api/panou/fisiere/${fisierDeschis.id}?inline=1`}
                  title={fisierDeschis.numeFisier}
                  className="h-[68vh] w-full border-0 bg-paper"
                />
              </div>
            ) : (
              <Gol titlu="Dosarul nu are fișiere păstrate" text="Fișierele au fost șterse sau stocarea nu era configurată la încărcare." />
            )}

            {fisierDeschis && (
              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                <p className="truncate text-[12px] text-faint">
                  {fisierDeschis.numeFisier} · {(fisierDeschis.marime / 1024).toFixed(0)} KB
                </p>
                <a
                  href={`/api/panou/fisiere/${fisierDeschis.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
                >
                  <Ic.descarca className="h-3.5 w-3.5" /> Descarcă
                </a>
              </div>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------ constatările */}
        <div className="space-y-3">
          <Card>
            <CardCap
              titlu="Constatări"
              sub={
                grupate.deDecis.length > 0
                  ? `${grupate.deDecis.length} ${grupate.deDecis.length === 1 ? "așteaptă decizia dvs." : "așteaptă decizia dvs."}`
                  : "Toate au fost triate"
              }
              actiune={
                !semnat && (
                  <Buton fel="moale" marime="mic" onClick={() => setAdaugaDeschis(v => !v)}>
                    <Ic.plus className="h-3.5 w-3.5" /> Adaugă
                  </Buton>
                )
              }
            />

            {adaugaDeschis && !semnat && (
              <ConstatareNoua
                dosarId={dosarId}
                peSalvat={d => { setDate(v => (v ? { ...v, constatari: d.constatari, scor: d.scor } : v)); setAdaugaDeschis(false); }}
                peRenunt={() => setAdaugaDeschis(false)}
              />
            )}

            {date.constatari.length === 0 ? (
              <Gol
                pictograma={<Ic.bifa className="h-5 w-5" />}
                titlu="Nicio abatere semnalată"
                text="Verificările automate n-au găsit nimic de semnalat. Puteți adăuga propriile constatări înainte de semnare."
              />
            ) : (
              <ul className="divide-y divide-line">
                {[...grupate.deDecis, ...grupate.acceptate, ...grupate.respinse].map(c => (
                  <RandConstatare
                    key={c.id}
                    c={c}
                    blocat={semnat}
                    lucreaza={lucreaza === c.id}
                    peSchimbare={m => schimba(c.id, m)}
                  />
                ))}
              </ul>
            )}
          </Card>

          {/* ----------------------------------------------- defalcarea */}
          {date.scor.defalcare.length > 0 && (
            <Card>
              <CardCap titlu="Cum s-a format scorul" sub="Fiecare constatare taie din 100. A doua de aceeași severitate taie mai puțin decât prima." />
              <ul className="px-5 py-3">
                {date.scor.defalcare.map(d => (
                  <li key={d.severitate} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full bg-current ${
                        TON_SEV[d.severitate] === "bad" ? "text-bad"
                        : TON_SEV[d.severitate] === "risk" ? "text-risk"
                        : TON_SEV[d.severitate] === "warn" ? "text-warn"
                        : TON_SEV[d.severitate] === "info" ? "text-info" : "text-muted"
                      }`} />
                      <span className="text-muted">{d.eticheta}</span>
                      <span className="tnum text-faint">× {d.numar}</span>
                    </span>
                    <span className="tnum text-muted">−{d.puncte.toFixed(1).replace(".", ",")}</span>
                  </li>
                ))}
                <li className="mt-1.5 flex items-center justify-between gap-3 border-t border-line pt-2.5 text-[13px] font-semibold">
                  <span className="text-ink">Scor final</span>
                  <span className="tnum text-ink">{date.scor.valoare}%</span>
                </li>
              </ul>
            </Card>
          )}

          {/* -------------------------------------------------- semnare */}
          {!semnat && (
            <Card>
              <CardCap titlu="Semnarea raportului" sub="După semnare, raportul devine vizibil asociației și nu mai poate fi modificat." />
              <div className="space-y-3 px-5 py-4">
                <Camp eticheta="Concluzia cenzorului" ajutor="Opțional. Ce scrieți aici apare la finalul raportului, sub constatări.">
                  <textarea
                    value={concluzie}
                    onChange={e => setConcluzie(e.target.value)}
                    rows={4}
                    placeholder="ex. Evidența contabilă a lunii a fost condusă corect, cu excepția aspectelor semnalate la punctele 1 și 3, care se remediază până la următoarea listă de plată."
                    className={`${claseCamp} resize-y`}
                  />
                </Camp>

                {grupate.deDecis.length > 0 && (
                  <p className="flex items-start gap-2 text-[12.5px] text-warn">
                    <Ic.info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {grupate.deDecis.length} {grupate.deDecis.length === 1 ? "constatare nu a fost triată" : "constatări nu au fost triate"}.
                    La semnare se consideră însușite.
                  </p>
                )}

                {confirmSemnare ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Buton fel="principal" marime="mare" incarca={semneaza} onClick={semneazaRaportul}>
                      <Ic.semnatura className="h-4 w-4" /> Confirm semnarea
                    </Buton>
                    <Buton fel="fantoma" onClick={() => setConfirmSemnare(false)}>Renunță</Buton>
                  </div>
                ) : (
                  <Buton fel="principal" marime="mare" className="w-full" onClick={() => setConfirmSemnare(true)}>
                    <Ic.semnatura className="h-4 w-4" /> Semnează și trimite asociației
                  </Buton>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ rând */

function RandConstatare({
  c, blocat, lucreaza, peSchimbare,
}: {
  c: Constatare; blocat: boolean; lucreaza: boolean;
  peSchimbare: (m: Record<string, unknown>) => void;
}) {
  const [desfacut, setDesfacut] = useState(c.stare === "deschisa");
  const [nota, setNota] = useState(c.notaCenzor ?? "");
  const ton = TON_SEV[c.severitate];
  const respinsa = c.stare === "respinsa";

  return (
    <li className={`px-5 py-4 transition-opacity ${respinsa ? "opacity-45" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
          ton === "bad" ? "bg-bad" : ton === "risk" ? "bg-risk" : ton === "warn" ? "bg-warn" : ton === "info" ? "bg-info" : "bg-muted"
        }`} />

        <div className="min-w-0 flex-1">
          <button onClick={() => setDesfacut(v => !v)} className="block w-full text-left">
            <span className="flex flex-wrap items-center gap-2">
              <span className={`text-[13.5px] font-medium ${respinsa ? "text-faint line-through" : "text-ink"}`}>{c.titlu}</span>
              <Eticheta ton={ton}>{SEVERITATI[c.severitate].eticheta}</Eticheta>
              {c.stare === "acceptata" && <Eticheta ton="ok"><Ic.bifa className="h-3 w-3" /> însușită</Eticheta>}
              {respinsa && <Eticheta ton="neutru">respinsă</Eticheta>}
            </span>
            <span className="mt-0.5 block text-[11.5px] text-faint">
              {c.cod} · {SURSA[c.sursa]}
            </span>
          </button>

          {desfacut && (
            <div className="rise mt-2.5 space-y-3">
              <p className="text-[13px] leading-relaxed text-muted">{c.detaliu}</p>

              {c.probe.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
                  <p className="border-b border-line px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-faint">
                    Pe ce se sprijină
                  </p>
                  <dl className="divide-y divide-line">
                    {c.probe.map((p, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                        <dt className="text-[12px] text-faint">{p.eticheta}</dt>
                        <dd className="tnum shrink-0 text-[12.5px] text-ink">{p.valoare}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {c.temei ? (
                <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info-dim px-3 py-2 text-[12px] leading-relaxed text-info">
                  <Ic.balanta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {c.temei}
                </p>
              ) : (
                !blocat && (
                  <p className="flex items-start gap-2 text-[12px] leading-relaxed text-faint">
                    <Ic.info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Fără temei legal atașat — verificarea nu are unul confirmat. Completați-l dacă îl invocați în raport.
                  </p>
                )
              )}

              {c.recomandare && (
                <p className="text-[12.5px] leading-relaxed text-muted">
                  <span className="text-faint">Recomandare: </span>{c.recomandare}
                </p>
              )}

              {!blocat && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Buton
                      fel={c.stare === "acceptata" ? "reusita" : "moale"} marime="mic"
                      incarca={lucreaza} onClick={() => peSchimbare({ stare: "acceptata" })}
                    >
                      <Ic.bifa className="h-3.5 w-3.5" /> Îmi însușesc
                    </Buton>
                    <Buton
                      fel={respinsa ? "pericol" : "moale"} marime="mic"
                      incarca={lucreaza} onClick={() => peSchimbare({ stare: respinsa ? "deschisa" : "respinsa" })}
                    >
                      <Ic.x className="h-3.5 w-3.5" /> {respinsa ? "Reactivează" : "Resping"}
                    </Buton>
                    <select
                      value={c.severitate}
                      onChange={e => peSchimbare({ severitate: e.target.value })}
                      className="h-8 rounded-lg border border-line-strong bg-surface-1 px-2 text-[12px] text-muted outline-none focus:border-brand/60"
                    >
                      {(Object.keys(SEVERITATI) as Severitate[]).map(s => (
                        <option key={s} value={s}>{SEVERITATI[s].eticheta}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      onBlur={() => { if (nota !== (c.notaCenzor ?? "")) peSchimbare({ notaCenzor: nota }); }}
                      placeholder="Notă proprie asupra acestei constatări (apare în raport)"
                      className={`${claseCamp} py-2 text-[12.5px]`}
                    />
                  </div>
                </>
              )}

              {blocat && c.notaCenzor && (
                <p className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-[12.5px] italic text-muted">
                  {c.notaCenzor}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setDesfacut(v => !v)}
          aria-label={desfacut ? "Restrânge" : "Extinde"}
          className="shrink-0 rounded-md p-1 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {desfacut ? <Ic.sus className="h-3.5 w-3.5" /> : <Ic.jos className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------- constatare nouă */

function ConstatareNoua({
  dosarId, peSalvat, peRenunt,
}: {
  dosarId: string;
  peSalvat: (d: { constatari: Constatare[]; scor: Scor }) => void;
  peRenunt: () => void;
}) {
  const [titlu, setTitlu] = useState("");
  const [detaliu, setDetaliu] = useState("");
  const [severitate, setSeveritate] = useState<Severitate>("medie");
  const [temei, setTemei] = useState("");
  const [recomandare, setRecomandare] = useState("");
  const [salveaza, setSalveaza] = useState(false);
  const [eroare, setEroare] = useState("");

  async function salveazaConstatarea() {
    setSalveaza(true);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/dosare/${dosarId}/constatari`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titlu, detaliu, severitate, temei, recomandare }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      peSalvat(d);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Constatarea nu a fost salvată.");
    } finally {
      setSalveaza(false);
    }
  }

  return (
    <div className="space-y-3 border-b border-line bg-surface-1 px-5 py-4">
      <Camp eticheta="Ce ați constatat" obligatoriu>
        <input value={titlu} onChange={e => setTitlu(e.target.value)} className={claseCamp}
          placeholder="ex. Bon fiscal fără codul fiscal al asociației" />
      </Camp>
      <Camp eticheta="Detaliu">
        <textarea value={detaliu} onChange={e => setDetaliu(e.target.value)} rows={3} className={`${claseCamp} resize-y`}
          placeholder="Ce anume ați văzut în documente și de ce contează." />
      </Camp>
      <div className="grid gap-3 sm:grid-cols-2">
        <Camp eticheta="Severitate">
          <select value={severitate} onChange={e => setSeveritate(e.target.value as Severitate)} className={claseCamp}>
            {(Object.keys(SEVERITATI) as Severitate[]).map(s => (
              <option key={s} value={s}>{SEVERITATI[s].eticheta}</option>
            ))}
          </select>
        </Camp>
        <Camp eticheta="Temei legal" ajutor="Doar dacă îl invocați în raport.">
          <input value={temei} onChange={e => setTemei(e.target.value)} className={claseCamp}
            placeholder="ex. art. 67 din Legea nr. 196/2018" />
        </Camp>
      </div>
      <Camp eticheta="Recomandare">
        <input value={recomandare} onChange={e => setRecomandare(e.target.value)} className={claseCamp}
          placeholder="Ce trebuie făcut pentru remediere." />
      </Camp>
      {eroare && <p className="text-[12.5px] text-bad">{eroare}</p>}
      <div className="flex gap-2">
        <Buton fel="principal" marime="mic" incarca={salveaza} disabled={titlu.trim().length < 4} onClick={salveazaConstatarea}>
          Adaugă constatarea
        </Buton>
        <Buton fel="fantoma" marime="mic" onClick={peRenunt}>Renunță</Buton>
      </div>
    </div>
  );
}

export { lei };
