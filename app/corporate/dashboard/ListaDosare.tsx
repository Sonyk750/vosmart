"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Buton, Card, CardCap, dataRo, Eticheta, Gol, Ic, InelScor, Paginare, Rotitor, Schelet, Ton,
} from "@/app/components/ui";
import FluxDosar from "./FluxDosar";

/**
 * Dosarele trimise, pe pagini.
 *
 * Ecranul vechi le arata pe toate, intr-o singura coloana care crestea la
 * nesfarsit, si le cerea din nou de la server la fiecare 8 secunde cat timp
 * exista macar unul in analiza. Aici lista vine pe pagini, iar interogarea deasa
 * se face doar pentru dosarul care chiar e in lucru, printr-o ruta mica.
 */

type Dosar = {
  id: string;
  titlu: string;
  luna: string | null;
  an: number | null;
  status: string;
  etapa: string;
  stareEtapa: string;
  scor: number | null;
  verdict: string | null;
  incredere: number | null;
  rezumat: string | null;
  creatLa: string;
  fisiere: { id: string; fileName: string; label: string; type: string; size: number }[];
  constatari: { total: number; critice: number; ridicate: number };
  ultimulPas: { mesaj: string; etapa: string; stare: string; createdAt: string } | null;
};

const VERDICT: Record<string, { text: string; ton: Ton }> = {
  conform: { text: "Conform", ton: "ok" },
  observatii: { text: "Cu observații", ton: "info" },
  neconform: { text: "Neconform", ton: "warn" },
  grav: { text: "Deficiențe grave", ton: "bad" },
};

const ETAPA_TEXT: Record<string, string> = {
  intrare: "Se preia", extragere: "Se citesc documentele", verificare: "Se verifică",
  sinteza: "Se sintetizează", revizuire: "La cenzor", semnat: "Semnat",
};

export default function ListaDosare({ reincarca }: { reincarca: number }) {
  const [dosare, setDosare] = useState<Dosar[]>([]);
  const [pagina, setPagina] = useState(1);
  const [pagini, setPagini] = useState(1);
  const [total, setTotal] = useState(0);
  const [incarca, setIncarca] = useState(true);
  const [sterge, setSterge] = useState<string | null>(null);
  const [confirma, setConfirma] = useState<string | null>(null);

  const adu = useCallback(async (p: number) => {
    try {
      const r = await fetch(`/api/dashboard/documents?pagina=${p}`);
      if (!r.ok) return;
      const d = await r.json();
      setDosare(d.dosare);
      setPagini(d.pagini);
      setTotal(d.total);
    } finally {
      setIncarca(false);
    }
  }, []);

  useEffect(() => {
    // Cererea porneste in efect, dar starea se schimba abia in raspuns: un
    // `setState` chiar in corpul efectului declanseaza o a doua randare inainte
    // ca prima sa se aseze.
    let activ = true;
    fetch(`/api/dashboard/documents?pagina=${pagina}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!activ || !d) return;
        setDosare(d.dosare);
        setPagini(d.pagini);
        setTotal(d.total);
        setIncarca(false);
      })
      .catch(() => { if (activ) setIncarca(false); });
    return () => { activ = false; };
  }, [pagina, reincarca]);

  async function stergeDosar(id: string) {
    setSterge(id);
    const r = await fetch(`/api/dashboard/documents/${id}`, { method: "DELETE" });
    if (r.ok) {
      // Daca era ultimul de pe pagina, cadem o pagina inapoi ca sa nu ramana
      // omul intr-o pagina goala.
      if (dosare.length === 1 && pagina > 1) setPagina(pagina - 1);
      else adu(pagina);
    }
    setSterge(null);
    setConfirma(null);
  }

  if (incarca && dosare.length === 0) {
    return (
      <Card className="space-y-3 px-5 py-5">
        <Schelet className="h-14" /><Schelet className="h-14" /><Schelet className="h-14" />
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <Gol
          pictograma={<Ic.dosar className="h-5 w-5" />}
          titlu="Niciun dosar încă"
          text="Trimite primul dosar lunar și verificarea pornește imediat. Rezultatul ajunge la cenzor, care îl semnează."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardCap titlu="Dosarele trimise" sub={`${total} ${total === 1 ? "dosar" : "dosare"} în total`} />

      <ul className="divide-y divide-line">
        {dosare.map(d => {
          const inLucru = d.etapa !== "revizuire" && d.etapa !== "semnat" && d.stareEtapa !== "esuata";
          const esuat = d.stareEtapa === "esuata";
          const verdict = d.verdict ? VERDICT[d.verdict] : null;

          return (
            <li key={d.id} className="rise px-5 py-4">
              <div className="flex items-start gap-4">
                {/* Scor sau stare */}
                <div className="shrink-0 pt-0.5">
                  {d.scor !== null && !inLucru ? (
                    <InelScor valoare={d.scor} ton={verdict?.ton ?? "neutru"} marime={56} />
                  ) : (
                    <span className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                      esuat ? "border-bad/40 bg-bad-dim text-bad" : "border-brand/40 bg-brand-dim text-brand-soft"
                    }`}>
                      {esuat ? <Ic.alerta className="h-5 w-5" /> : <Rotitor className="h-4 w-4" />}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-medium tracking-tight text-ink">{d.titlu}</p>
                    {verdict && !inLucru && <Eticheta ton={verdict.ton}>{verdict.text}</Eticheta>}
                    {inLucru && <Eticheta ton="brand">{ETAPA_TEXT[d.etapa] ?? "În lucru"}</Eticheta>}
                    {esuat && <Eticheta ton="bad">Oprit</Eticheta>}
                    {d.etapa === "revizuire" && <Eticheta ton="info">La cenzor</Eticheta>}
                  </div>

                  <p className={`mt-1 text-[12.5px] leading-relaxed ${esuat ? "text-bad" : "text-faint"}`}>
                    {d.ultimulPas?.mesaj ?? d.rezumat ?? `Trimis ${dataRo(d.creatLa)}`}
                  </p>

                  {!inLucru && !esuat && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                      <span className="text-muted">
                        <span className="tnum font-medium">{d.constatari.total}</span>{" "}
                        {d.constatari.total === 1 ? "constatare" : "constatări"}
                      </span>
                      {d.constatari.critice > 0 && (
                        <span className="tnum text-bad">{d.constatari.critice} critice</span>
                      )}
                      {d.constatari.ridicate > 0 && (
                        <span className="tnum text-risk">{d.constatari.ridicate} de severitate ridicată</span>
                      )}
                      {d.incredere !== null && (
                        <span className="tnum text-faint" title="Cât din datele urmărite s-au găsit în documente.">
                          încredere date {d.incredere}%
                        </span>
                      )}
                    </div>
                  )}

                  {d.fisiere.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {d.fisiere.map(f => (
                        <a
                          key={f.id}
                          href={`/api/dashboard/documents/${d.id}/fisiere/${f.id}`}
                          title={`Descarcă ${f.fileName}`}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-3 px-2 py-1 text-[11px] text-muted transition-colors hover:border-brand/40 hover:text-brand-soft"
                        >
                          <Ic.descarca className="h-3 w-3" />
                          {f.label || f.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {confirma === d.id ? (
                    <div className="flex items-center gap-1.5">
                      <Buton fel="fantoma" marime="mic" onClick={() => setConfirma(null)}>Renunță</Buton>
                      <Buton fel="pericol" marime="mic" incarca={sterge === d.id} onClick={() => stergeDosar(d.id)}>
                        Șterge definitiv
                      </Buton>
                    </div>
                  ) : (
                    <Buton fel="fantoma" marime="mic" onClick={() => setConfirma(d.id)} aria-label="Șterge dosarul">
                      <Ic.cos className="h-3.5 w-3.5" />
                    </Buton>
                  )}
                </div>
              </div>

              {/* Dosarul in lucru isi arata fluxul deschis, la locul lui in lista */}
              {inLucru && (
                <div className="mt-3">
                  <FluxDosar dosarId={d.id} peFinal={() => adu(pagina)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Paginare
        pagina={pagina} pagini={pagini} total={total} numeElement="dosare"
        peSchimbare={p => { setPagina(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />
    </Card>
  );
}
