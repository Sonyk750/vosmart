"use client";
import { useEffect, useRef, useState } from "react";
import { Bara, Buton, Card, CardCap, Ic, InelScor, Rotitor, Ton } from "@/app/components/ui";

/**
 * Ce se intampla cu dosarul, in timp real.
 *
 * Fiecare rand de aici vine dintr-un eveniment scris pe server, la momentul in
 * care s-a intamplat. Inainte, ecranul arata cinci etichete fixe („Pregătire,
 * Procesare, Analiză AI, Raport, Complet") si un procent care crestea singur din
 * browser: daca analiza cadea la primul document, bara continua linistita pana
 * la 90% si scria „Finalizare raport...".
 *
 * Acum, cand ceva cade, bara se opreste unde a ajuns si scrie motivul.
 */

type Etapa = {
  cheie: string;
  eticheta: string;
  descriere: string;
  stare: "asteptare" | "in_lucru" | "gata" | "esuata";
  mesaj: string | null;
  la: string | null;
};

type Flux = {
  etapaCurenta: string;
  stare: string;
  esuat: boolean;
  procent: number;
  etape: Etapa[];
  scor: number | null;
  verdict: string | null;
  incredere: number | null;
  numarConstatari: number;
  durataSecunde: number | null;
};

const VERDICT_TON: Record<string, Ton> = { conform: "ok", observatii: "info", neconform: "warn", grav: "bad" };
const VERDICT_TEXT: Record<string, string> = {
  conform: "Conform", observatii: "Conform cu observații",
  neconform: "Neconform", grav: "Deficiențe grave",
};

export default function FluxDosar({ dosarId, peFinal }: { dosarId: string; peFinal?: () => void }) {
  const [flux, setFlux] = useState<Flux | null>(null);
  const anuntat = useRef(false);

  useEffect(() => {
    let activ = true;
    let intarziere = 1500;

    async function verifica() {
      try {
        const r = await fetch(`/api/dashboard/dosare/${dosarId}/flux`);
        if (!r.ok) return;
        const d: Flux = await r.json();
        if (!activ) return;
        setFlux(d);

        const terminat = d.esuat || d.etapaCurenta === "revizuire" || d.etapaCurenta === "semnat";
        if (terminat) {
          if (!anuntat.current) { anuntat.current = true; peFinal?.(); }
          return;
        }
        // Interogam des la inceput, apoi tot mai rar. O citire de dosar mare
        // poate dura minute; n-are rost sa batem la usa de doua ori pe secunda.
        intarziere = Math.min(6000, Math.round(intarziere * 1.25));
      } catch {
        intarziere = Math.min(10000, intarziere * 2);
      }
      if (activ) setTimeout(verifica, intarziere);
    }

    verifica();
    return () => { activ = false; };
  }, [dosarId, peFinal]);

  if (!flux) {
    return (
      <Card className="flex items-center gap-3 px-5 py-6">
        <Rotitor className="h-4 w-4 text-brand" />
        <span className="text-[13.5px] text-muted">Se deschide dosarul…</span>
      </Card>
    );
  }

  const gata = flux.etapaCurenta === "revizuire" || flux.etapaCurenta === "semnat";
  const ton: Ton = flux.esuat ? "bad" : gata ? (VERDICT_TON[flux.verdict ?? ""] ?? "ok") : "brand";

  return (
    <Card className="overflow-hidden">
      <CardCap
        titlu={flux.esuat ? "Verificarea s-a oprit" : gata ? "Verificare încheiată" : "Se verifică dosarul"}
        sub={
          flux.esuat ? "Dosarul a rămas salvat. Poți relua după ce corectezi documentele."
          : gata ? `${flux.numarConstatari} ${flux.numarConstatari === 1 ? "constatare" : "constatări"} · proiectul de raport a plecat la cenzor`
          : "Poți închide pagina — verificarea continuă."
        }
        actiune={
          gata && flux.scor !== null ? (
            <InelScor valoare={flux.scor} ton={ton} marime={72} eticheta="scor" />
          ) : (
            <span className="tnum text-[13px] font-medium text-muted">{flux.procent}%</span>
          )
        }
      />

      <div className="px-5 pt-4">
        <Bara procent={flux.procent} ton={ton} inLucru={!gata && !flux.esuat} />
      </div>

      <ol className="px-5 py-4">
        {flux.etape.map((e, i) => {
          const ultima = i === flux.etape.length - 1;
          return (
            <li key={e.cheie} className="relative flex gap-3 pb-4 last:pb-0">
              {!ultima && (
                <span
                  aria-hidden
                  className={`absolute left-[9px] top-6 bottom-0 w-px ${e.stare === "gata" ? "bg-ok/35" : "bg-line-strong"}`}
                />
              )}
              <span className={`relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                e.stare === "gata" ? "border-ok/50 bg-ok-dim text-ok"
                : e.stare === "in_lucru" ? "border-brand/60 bg-brand-dim text-brand-soft pulse-ring"
                : e.stare === "esuata" ? "border-bad/50 bg-bad-dim text-bad"
                : "border-line-strong bg-surface-2 text-faint"
              }`}>
                {e.stare === "gata" ? <Ic.bifa className="h-2.5 w-2.5" />
                  : e.stare === "in_lucru" ? <Rotitor className="h-2.5 w-2.5" />
                  : e.stare === "esuata" ? <Ic.x className="h-2.5 w-2.5" />
                  : <span className="h-1 w-1 rounded-full bg-current" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium leading-tight ${
                  e.stare === "asteptare" ? "text-faint" : "text-ink"
                }`}>
                  {e.eticheta}
                </p>
                <p className={`mt-0.5 text-[12px] leading-relaxed ${e.stare === "esuata" ? "text-bad" : "text-faint"}`}>
                  {e.mesaj ?? e.descriere}
                </p>
              </div>
              {e.la && e.stare !== "asteptare" && (
                <span className="tnum shrink-0 text-[11px] text-faint">
                  {new Date(e.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {gata && flux.scor !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-1 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]">
            <span className="text-muted">
              Verdict: <strong className={`font-semibold ${ton === "ok" ? "text-ok" : ton === "bad" ? "text-bad" : ton === "warn" ? "text-warn" : "text-info"}`}>
                {VERDICT_TEXT[flux.verdict ?? ""] ?? "—"}
              </strong>
            </span>
            {flux.incredere !== null && (
              <span className="text-faint" title="Cât din datele pe care le urmărim s-au găsit efectiv în documente.">
                Încredere date: <span className="tnum text-muted">{flux.incredere}%</span>
              </span>
            )}
            {flux.durataSecunde !== null && (
              <span className="tnum text-faint">{flux.durataSecunde}s</span>
            )}
          </div>
        </div>
      )}

      {flux.esuat && (
        <div className="border-t border-line bg-surface-1 px-5 py-3.5">
          <Buton fel="moale" marime="mic" onClick={() => window.location.reload()}>
            <Ic.ceas className="h-3.5 w-3.5" /> Reîncarcă
          </Buton>
        </div>
      )}
    </Card>
  );
}
