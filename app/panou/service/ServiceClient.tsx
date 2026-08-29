"use client";

import { useEffect, useMemo, useState } from "react";
import { CampCod } from "@/app/components/CampCod";
import { Buton, Card, CardCap, Eticheta, Rotitor } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";
import { LUNGIME_COD } from "@/lib/parola-cod";

type Ruta = {
  cale: string; url: string; metode: string[]; garzi: string[];
  tabele: string[]; libImp: string[]; runtime: string | null; linii: number;
};
type Lib = { cale: string; nume: string; exporturi: string[]; linii: number; folositDe: string[] };
type Pagina = { cale: string; url: string; linii: number };
type Caiet = { generat: string; fisiere: number; rute: Ruta[]; libs: Lib[]; pagini: Pagina[] };

type Stare = {
  acum: string;
  bd: { ok: boolean; latentaMs: number };
  numere: {
    utilizatori: number; sesiuniVii: number; contracteActive: number; contracteSuspendate: number;
    dosare: number; dosare24h: number; rapoarteDraft: number; rapoartePublicate: number;
    comenziInitiate: number; comenziPlatite: number; esuate: number;
  };
  etape: { etapa: string; cate: number }[];
  deploy: {
    mediu: string; ramura: string | null; commit: string | null;
    mesaj: string | null; regiune: string | null; node: string;
  };
  ultimaSesiune: { cand: string; email: string | null; rol: string | null } | null;
  chei: { nume: string; pus: boolean; nota?: string; atentie?: boolean }[];
};

export default function ServiceClient({ deblocat }: { deblocat: boolean }) {
  const [deschis, setDeschis] = useState(deblocat);
  return deschis ? <Caietul /> : <Incuietoare onDeschis={() => setDeschis(true)} />;
}

/* ─── Ecranul cu cele 8 casute ─────────────────────────────────────────────── */

function Incuietoare({ onDeschis }: { onDeschis: () => void }) {
  const [cerut, setCerut]   = useState(false);
  const [trimit, setTrimit] = useState(false);
  const [cod, setCod]       = useState("");
  const [err, setErr]       = useState("");
  const [info, setInfo]     = useState("");

  async function cereCod() {
    setTrimit(true); setErr(""); setInfo("");
    try {
      const res = await fetch("/api/service/cod", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Nu am putut trimite codul.");
      setCerut(true);
      setInfo(d.avertisment ?? "Codul a plecat pe email. Îl găsești în câteva secunde.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nu am putut trimite codul.");
    } finally {
      setTrimit(false);
    }
  }

  async function verifica(valoare: string) {
    setErr("");
    try {
      const res = await fetch("/api/service/verifica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cod: valoare }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Cod greșit.");
      onDeschis();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cod greșit.");
      setCod("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold tracking-tight">Caiet de service</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        Harta aplicației: rute, fișiere, legături — plus starea ei de acum.
      </p>

      <Card className="mt-5 px-5 py-6">
        {!cerut ? (
          <>
            <p className="text-[13.5px] leading-relaxed text-muted">
              Îți trimitem pe email un cod din {LUNGIME_COD} caractere. Îl scrii aici și
              caietul se deschide pentru 8 ore.
            </p>
            <Buton fel="principal" className="mt-4" onClick={cereCod} incarca={trimit}>
              <Ic.cheie className="h-3.5 w-3.5" />
              {trimit ? "Se trimite…" : "Trimite-mi codul"}
            </Buton>
          </>
        ) : (
          <>
            <p className="text-[13.5px] leading-relaxed text-muted">
              Scrie codul primit pe email, câte un caracter în fiecare căsuță.
            </p>
            <div className="mt-4">
              <CampCod valoare={cod} onChange={setCod} onComplet={verifica} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Buton
                fel="principal"
                onClick={() => verifica(cod)}
                disabled={cod.replace(/\s/g, "").length !== LUNGIME_COD}
              >
                Deschide caietul
              </Buton>
              <Buton onClick={cereCod} incarca={trimit}>
                {trimit ? "Se trimite…" : "Trimite alt cod"}
              </Buton>
            </div>
          </>
        )}

        {info && <p className="mt-4 text-[13px] text-brand-soft">{info}</p>}
        {err && <p className="mt-4 text-[13px] text-bad">{err}</p>}
      </Card>
    </div>
  );
}

/* ─── Caietul propriu-zis ──────────────────────────────────────────────────── */

const TON_METODA: Record<string, "info" | "ok" | "warn" | "bad" | "neutru"> = {
  GET: "info", POST: "ok", PATCH: "warn", PUT: "warn", DELETE: "bad",
};

type Fila = "stare" | "rute" | "tabele" | "lib" | "pagini";
const FILE: [Fila, string][] = [
  ["stare", "Stare"], ["rute", "Rute"], ["tabele", "Tabele"],
  ["lib", "Bibliotecă"], ["pagini", "Pagini"],
];

function Caietul() {
  const [date, setDate]   = useState<Caiet | null>(null);
  const [stare, setStare] = useState<Stare | null>(null);
  const [err, setErr]     = useState("");
  const [fila, setFila]   = useState<Fila>("stare");
  const [q, setQ]         = useState("");
  const [metoda, setMetoda] = useState<string | null>(null);
  const [doarFaraGard, setDoarFaraGard] = useState(false);
  const [deschise, setDeschise] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/service/caiet")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Nu am putut încărca datele.");
        setDate(d);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Eroare"));
  }, []);

  // Starea vine separat: harta e un fisier, starea e o intrebare pusa bazei.
  // Daca a doua intarzie sau cade, prima trebuie sa se vada oricum.
  const cereStarea = () => {
    setStare(null);
    fetch("/api/service/stare")
      .then((r) => r.json())
      .then((d) => setStare(d.error ? null : d))
      .catch(() => setStare(null));
  };
  useEffect(cereStarea, []);

  /** Indexul invers: pentru fiecare tabelă, rutele care o ating. */
  const tabele = useMemo(() => {
    if (!date) return [];
    const m = new Map<string, Ruta[]>();
    for (const r of date.rute) {
      for (const t of r.tabele) {
        if (!m.has(t)) m.set(t, []);
        m.get(t)!.push(r);
      }
    }
    return Array.from(m, ([nume, rute]) => ({ nume, rute })).sort((a, b) => b.rute.length - a.rute.length);
  }, [date]);

  if (err) {
    return <div className="mx-auto max-w-3xl px-4 py-8"><Card className="px-5 py-6 text-[13.5px] text-bad">{err}</Card></div>;
  }
  if (!date) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[13.5px] text-faint">
        <Rotitor /> Se încarcă harta…
      </div>
    );
  }

  const cauta = q.trim().toLowerCase();
  const potrivit = (...campuri: (string | string[])[]) =>
    !cauta || campuri.flat().join(" ").toLowerCase().includes(cauta);

  const rute = date.rute.filter((r) =>
    potrivit(r.url, r.cale, r.metode, r.tabele, r.libImp, r.garzi) &&
    (!metoda || r.metode.includes(metoda)) &&
    (!doarFaraGard || r.garzi.length === 0));
  const libs    = date.libs.filter((l) => potrivit(l.nume, l.cale, l.exporturi));
  const pagini  = date.pagini.filter((p) => potrivit(p.url, p.cale));
  const tabeleF = tabele.filter((t) => potrivit(t.nume, t.rute.map((r) => r.url)));

  const faraGard = date.rute.filter((r) => r.garzi.length === 0).length;
  const orfane   = date.libs.filter((l) => l.folositDe.length === 0).length;
  const comuta = (k: string) => setDeschise((d) => ({ ...d, [k]: !d[k] }));

  /** Sare în altă filă cu căutarea pusă — click pe `lib/x` duce la fișierul x. */
  const sariLa = (f: Fila, termen: string) => {
    setFila(f); setQ(termen); setMetoda(null); setDoarFaraGard(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Caiet de service</h1>
          <p className="mt-0.5 text-[13px] text-faint">
            Harta aplicației, generată din cod · {date.fisiere} fișiere sursă · citită pe {date.generat}
          </p>
        </div>
      </div>

      {/* Cifrele care se citesc dintr-o privire. Ultimele două sunt singurele
          care pot fi „în neregulă", deci doar ele se colorează. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Cifra valoare={date.rute.length} eticheta="rute API" />
        <Cifra valoare={date.pagini.length} eticheta="pagini" />
        <Cifra valoare={date.libs.length} eticheta="fișiere lib" />
        <Cifra valoare={tabele.length} eticheta="tabele atinse" />
        <Cifra valoare={faraGard} eticheta="rute fără pază" atentie={faraGard > 0}
               onClick={() => { setFila("rute"); setDoarFaraGard(true); setQ(""); }} />
        <Cifra valoare={orfane} eticheta="lib nefolosite" atentie={orfane > 0} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Ic.cauta className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="caută rută, fișier, tabelă, funcție…"
            className="h-9.5 w-full rounded-[var(--radius-field)] border border-line-strong bg-surface-2 pl-9 pr-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-faint focus:border-brand/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILE.map(([k, et]) => (
            <Buton key={k} marime="mic" fel={fila === k ? "principal" : "moale"} onClick={() => setFila(k)}>
              {et}
            </Buton>
          ))}
        </div>
      </div>

      {/* Filtrele au sens doar peste rute; pe celelalte file ar minți. */}
      {fila === "rute" && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
            <button key={m} onClick={() => setMetoda(metoda === m ? null : m)}
              className={metoda === m ? "opacity-100" : "opacity-60 hover:opacity-100"}>
              <Eticheta ton={TON_METODA[m]}>{m}</Eticheta>
            </button>
          ))}
          <button onClick={() => setDoarFaraGard(!doarFaraGard)}
            className={doarFaraGard ? "opacity-100" : "opacity-60 hover:opacity-100"}>
            <Eticheta ton="warn">fără pază</Eticheta>
          </button>
          <span className="ml-auto text-[12px] text-faint">{rute.length} din {date.rute.length}</span>
        </div>
      )}

      <div className="mt-4">
        {fila === "stare" && <PanouStare stare={stare} onReimprospateaza={cereStarea} />}

        {fila === "rute" && (
          <Lista goale={rute.length === 0} text="Nicio rută nu se potrivește.">
            {rute.map((r) => {
              const k = "r" + r.cale;
              const faraPaza = r.garzi.length === 0;
              return (
                <Fisa key={k} deschis={!!deschise[k]} onClick={() => comuta(k)} atentie={faraPaza}
                  titlu={r.url}
                  dreapta={<span className="flex gap-1">{r.metode.map((m) => <Eticheta key={m} ton={TON_METODA[m]}>{m}</Eticheta>)}</span>}>
                  <Rand eticheta="fișier"><Cod copiaza>{r.cale}</Cod></Rand>
                  <Rand eticheta="acces">
                    {faraPaza
                      ? <Cod ton="atentie">fără pază</Cod>
                      : r.garzi.map((g) => <Cod key={g} ton="bun">{g}</Cod>)}
                  </Rand>
                  {r.tabele.length > 0 && (
                    <Rand eticheta="tabele">
                      {r.tabele.map((x) => <Cod key={x} onClick={() => sariLa("tabele", x)}>{x}</Cod>)}
                    </Rand>
                  )}
                  {r.libImp.length > 0 && (
                    <Rand eticheta="folosește">
                      {r.libImp.map((x) => <Cod key={x} onClick={() => sariLa("lib", x)}>lib/{x}</Cod>)}
                    </Rand>
                  )}
                  {r.runtime && <Rand eticheta="runtime"><Cod>{r.runtime}</Cod></Rand>}
                </Fisa>
              );
            })}
          </Lista>
        )}

        {/* Intrebarea „cine umbla la tabela asta?" nu avea pana acum niciun raspuns
            scurt: se cauta prin tot codul. Aici e indexul invers, gata facut. */}
        {fila === "tabele" && (
          <Lista goale={tabeleF.length === 0} text="Nicio tabelă nu se potrivește.">
            {tabeleF.map((t) => {
              const k = "t" + t.nume;
              const scriu = t.rute.filter((r) => r.metode.some((m) => m !== "GET"));
              return (
                <Fisa key={k} deschis={!!deschise[k]} onClick={() => comuta(k)}
                  titlu={t.nume}
                  dreapta={
                    <span className="flex items-center gap-1.5">
                      <Eticheta>{t.rute.length} rute</Eticheta>
                      {scriu.length > 0 && <Eticheta ton="warn">{scriu.length} scriu</Eticheta>}
                    </span>
                  }>
                  {t.rute.map((r) => (
                    <div key={r.cale} className="flex items-center gap-2 py-0.5">
                      <span className="flex w-28 shrink-0 gap-1">
                        {r.metode.map((m) => <Eticheta key={m} ton={TON_METODA[m]}>{m}</Eticheta>)}
                      </span>
                      <Cod onClick={() => sariLa("rute", r.url)}>{r.url}</Cod>
                    </div>
                  ))}
                </Fisa>
              );
            })}
          </Lista>
        )}

        {fila === "lib" && (
          <Lista goale={libs.length === 0} text="Niciun fișier nu se potrivește.">
            {libs.map((l) => {
              const k = "l" + l.cale;
              return (
                <Fisa key={k} deschis={!!deschise[k]} onClick={() => comuta(k)}
                  atentie={l.folositDe.length === 0}
                  titlu={`lib/${l.nume}`}
                  dreapta={<Eticheta ton={l.folositDe.length >= 10 ? "warn" : "neutru"}>{l.folositDe.length}</Eticheta>}>
                  <Rand eticheta="fișier"><Cod copiaza>{l.cale}</Cod></Rand>
                  <Rand eticheta="exportă">
                    {l.exporturi.length ? l.exporturi.map((e) => <Cod key={e}>{e}</Cod>) : <Cod ton="atentie">nimic</Cod>}
                  </Rand>
                  <Rand eticheta="folosit în">
                    {l.folositDe.length
                      ? l.folositDe.map((f) => <Cod key={f}>{f}</Cod>)
                      : <Cod ton="atentie">nicăieri</Cod>}
                  </Rand>
                </Fisa>
              );
            })}
          </Lista>
        )}

        {fila === "pagini" && (
          <Card className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-faint">
                  <th className="border-b border-line px-4 py-2.5 text-left">Adresă</th>
                  <th className="border-b border-line px-4 py-2.5 text-left">Fișier</th>
                  <th className="border-b border-line px-4 py-2.5 text-right">Linii</th>
                </tr>
              </thead>
              <tbody>
                {pagini.map((p) => (
                  <tr key={p.cale}>
                    <td className="border-b border-line px-4 py-2 font-mono text-[12px]">{p.url}</td>
                    <td className="border-b border-line px-4 py-2 font-mono text-[12px] text-faint">{p.cale}</td>
                    <td className="border-b border-line px-4 py-2 text-right tnum">{p.linii}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Starea de acum ───────────────────────────────────────────────────────── */

function PanouStare({ stare, onReimprospateaza }: { stare: Stare | null; onReimprospateaza: () => void }) {
  if (!stare) return <p className="text-[13px] text-faint"><Rotitor /> Se măsoară starea…</p>;

  const { bd, numere, etape, deploy, chei, ultimaSesiune } = stare;
  const OK = "text-ok", WARN = "text-warn", BAD = "text-bad";

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardCap titlu="Baza de date" actiune={
          <Buton marime="mic" fel="fantoma" onClick={onReimprospateaza}>Măsoară din nou</Buton>
        } />
        <div className="px-5 py-4">
          <LinieStare eticheta="răspunde" valoare={bd.ok ? `da · ${bd.latentaMs} ms` : "NU"}
                      ton={!bd.ok ? BAD : bd.latentaMs > 400 ? WARN : OK} />
          <LinieStare eticheta="utilizatori"        valoare={String(numere.utilizatori)} />
          <LinieStare eticheta="sesiuni vii"        valoare={String(numere.sesiuniVii)} />
          <LinieStare eticheta="contracte active"   valoare={String(numere.contracteActive)} />
          <LinieStare eticheta="contracte suspendate" valoare={String(numere.contracteSuspendate)}
                      ton={numere.contracteSuspendate > 0 ? WARN : undefined} />
        </div>
      </Card>

      <Card>
        <CardCap titlu="Ce versiune rulează" />
        <div className="px-5 py-4">
          <LinieStare eticheta="mediu"   valoare={deploy.mediu} />
          <LinieStare eticheta="ramură"  valoare={deploy.ramura ?? "—"} />
          <LinieStare eticheta="commit"  valoare={deploy.commit ?? "—"} mono />
          {deploy.mesaj && <LinieStare eticheta="mesaj" valoare={deploy.mesaj} />}
          <LinieStare eticheta="regiune" valoare={deploy.regiune ?? "—"} />
          <LinieStare eticheta="node"    valoare={deploy.node} mono />
          <LinieStare eticheta="măsurat" valoare={new Date(stare.acum).toLocaleString("ro-RO")} />
        </div>
      </Card>

      {/* Cheile: se vede DACĂ sunt puse, niciodată ce conțin. Singura valoare
          citită e prefixul cheii Stripe — „bani reali" e o stare, nu un secret. */}
      <Card>
        <CardCap titlu="Chei și legături" />
        <div className="px-5 py-4">
          {chei.map((c) => (
            <LinieStare key={c.nume} eticheta={c.nume}
              valoare={c.pus ? (c.nota ? `pusă · ${c.nota}` : "pusă") : "LIPSEȘTE"}
              ton={!c.pus ? BAD : c.atentie ? WARN : OK} />
          ))}
        </div>
      </Card>

      {/* Un dosar cu etapa eșuată nu se repară singur și nu strigă nicăieri:
          până acum se vedea doar dacă intrai pe el. Aici e numărul, în față. */}
      <Card>
        <CardCap titlu="Dosare" sub="unde a ajuns fiecare" />
        <div className="px-5 py-4">
          <LinieStare eticheta="în total" valoare={String(numere.dosare)} />
          <LinieStare eticheta="deschise în 24 h" valoare={String(numere.dosare24h)} />
          <LinieStare eticheta="etape eșuate" valoare={String(numere.esuate)}
                      ton={numere.esuate > 0 ? BAD : OK} />
          {etape.length > 0 && (
            <div className="mt-2 border-t border-line pt-2">
              {etape.map((e) => (
                <LinieStare key={e.etapa} eticheta={e.etapa} valoare={String(e.cate)} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardCap titlu="Rapoarte și comenzi" />
        <div className="px-5 py-4">
          <LinieStare eticheta="rapoarte publicate" valoare={String(numere.rapoartePublicate)} ton={OK} />
          <LinieStare eticheta="rapoarte în lucru"  valoare={String(numere.rapoarteDraft)} />
          <LinieStare eticheta="comenzi plătite"    valoare={String(numere.comenziPlatite)} />
          <LinieStare eticheta="comenzi neterminate" valoare={String(numere.comenziInitiate)}
                      ton={numere.comenziInitiate > 0 ? WARN : undefined} />
        </div>
      </Card>

      <Card>
        <CardCap titlu="Ultima intrare" />
        <div className="px-5 py-4">
          {ultimaSesiune ? (
            <>
              <LinieStare eticheta="cine" valoare={ultimaSesiune.email ?? "—"} />
              <LinieStare eticheta="rol"  valoare={ultimaSesiune.rol ?? "—"} />
              <LinieStare eticheta="când" valoare={cand(ultimaSesiune.cand)} />
            </>
          ) : (
            <p className="text-[13px] text-faint">Nicio sesiune înregistrată.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

/** „acum 3 min", nu un timestamp: la service contează cât de proaspăt e, nu ora exactă. */
function cand(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)    return "chiar acum";
  if (min < 60)   return `acum ${min} min`;
  if (min < 1440) return `acum ${Math.floor(min / 60)} h`;
  const zile = Math.floor(min / 1440);
  return zile === 1 ? "ieri" : `acum ${zile} zile`;
}

/* ─── Bucatele de interfata ────────────────────────────────────────────────── */

function LinieStare({ eticheta, valoare, ton, mono }: {
  eticheta: string; valoare: string; ton?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-0.5 text-[13px]">
      <span className="min-w-0 flex-1 break-words text-faint">{eticheta}</span>
      <span className={`break-words text-right ${ton ?? "text-ink"} ${ton ? "font-medium" : ""} ${mono ? "font-mono text-[12px]" : ""}`}>
        {valoare}
      </span>
    </div>
  );
}

function Cifra({ valoare, eticheta, atentie, onClick }: {
  valoare: number; eticheta: string; atentie?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`px-3.5 py-2.5 ${onClick ? "cursor-pointer transition-colors hover:bg-surface-3" : ""}`}
    >
      <div className={`tnum text-[20px] font-semibold leading-tight ${atentie ? "text-warn" : "text-ink"}`}>{valoare}</div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-faint">{eticheta}</div>
    </Card>
  );
}

function Lista({ children, goale, text }: { children: React.ReactNode; goale: boolean; text: string }) {
  if (goale) return <p className="text-[13px] text-faint">{text}</p>;
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function Fisa({ titlu, dreapta, children, deschis, onClick, atentie }: {
  titlu: string; dreapta?: React.ReactNode; children: React.ReactNode;
  deschis: boolean; onClick: () => void; atentie?: boolean;
}) {
  return (
    <Card className={`overflow-hidden ${atentie ? "border-l-2 border-l-warn" : ""}`}>
      <button onClick={onClick} aria-expanded={deschis}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-3">
        <Ic.dreapta className={`h-3 w-3 shrink-0 text-faint transition-transform ${deschis ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1 break-all font-mono text-[12.5px]">{titlu}</span>
        {dreapta}
      </button>
      {deschis && <div className="border-t border-line px-3.5 pb-3 pt-2">{children}</div>}
    </Card>
  );
}

function Rand({ eticheta, children }: { eticheta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-0.5">
      <span className="w-24 shrink-0 pt-1 text-[10.5px] uppercase tracking-wider text-faint">{eticheta}</span>
      <span className="flex min-w-0 flex-wrap gap-1">{children}</span>
    </div>
  );
}

function Cod({ children, ton, onClick, copiaza }: {
  children: React.ReactNode; ton?: "bun" | "atentie";
  onClick?: () => void;
  /** Calea unui fișier: un click o pune în clipboard, gata de dat mai departe. */
  copiaza?: boolean;
}) {
  const [copiat, setCopiat] = useState(false);
  const culoare = copiat ? "text-ok bg-ok-dim"
    : ton === "bun" ? "text-info bg-info-dim"
    : ton === "atentie" ? "text-warn bg-warn-dim"
    : "text-muted bg-surface-3";

  const activ = !!onClick || !!copiaza;
  const apasa = () => {
    if (onClick) return onClick();
    if (copiaza) {
      navigator.clipboard?.writeText(String(children)).then(
        () => { setCopiat(true); setTimeout(() => setCopiat(false), 1200); },
        () => {},
      );
    }
  };

  return (
    <span
      onClick={activ ? apasa : undefined}
      role={activ ? "button" : undefined}
      title={copiaza ? "click — copiază calea" : onClick ? "click — caută" : undefined}
      className={`break-all rounded border border-line px-1.5 py-0.5 font-mono text-[11.5px] ${culoare} ${
        activ ? "cursor-pointer hover:brightness-125" : ""
      } ${onClick ? "underline decoration-dotted underline-offset-2" : ""}`}
    >{copiat ? "copiat" : children}</span>
  );
}
