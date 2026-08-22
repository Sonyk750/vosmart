"use client";
import React from "react";

/**
 * Piesele din care se construiesc panourile.
 *
 * Rostul lor e sa nu mai existe treizeci de variante de card si de buton, fiecare
 * cu alta nuanta scrisa de mana (`border-white/8`, `bg-white/[0.025]`,
 * `rounded-2xl` langa `rounded-xl`). Tot ce e aici foloseste tokenii din
 * `globals.css`, deci o schimbare de culoare se face intr-un singur loc.
 *
 * Si un lucru mic, dar care se vede: nu mai punem emoji in loc de pictograme.
 * Un „📁" se deseneaza altfel pe Windows, pe Mac si pe Android, are culoarea lui
 * si nu se aliniaza cu textul. Pictogramele de mai jos sunt SVG, mostenesc
 * culoarea textului si stau drept.
 */

/* ------------------------------------------------------------ PICTOGRAME */

// Pictogramele stau in `icoane.tsx`, un modul neutru: un obiect exportat de aici,
// dintr-un fisier `"use client"`, nu poate fi citit pe proprietati de o
// componenta de server. Vezi explicatia din capul acelui fisier.
import { Ic } from "./icoane";

/* ---------------------------------------------------------------- TONURI */

// Tipurile, clasele si formatarea stau in `baza.ts`, modul neutru: dintr-un
// fisier `"use client"` nu se poate chema o functie de catre o componenta de
// server. Aici raman doar componente.
import { TON_TEXT, type Ton } from "./baza";

const TON_CLASE: Record<Ton, string> = {
  neutru: "border-line-strong bg-surface-3 text-muted",
  brand: "border-brand/30 bg-brand-dim text-brand-soft",
  ok: "border-ok/30 bg-ok-dim text-ok",
  warn: "border-warn/30 bg-warn-dim text-warn",
  risk: "border-risk/30 bg-risk-dim text-risk",
  bad: "border-bad/30 bg-bad-dim text-bad",
  info: "border-info/30 bg-info-dim text-info",
};

/* ----------------------------------------------------------------- CARD */

export function Card({
  className = "", children, ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-[var(--radius-card)] border border-line bg-surface-2 ${className}`}>
      {children}
    </div>
  );
}

export function CardCap({ titlu, sub, actiune }: { titlu: React.ReactNode; sub?: React.ReactNode; actiune?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{titlu}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-faint">{sub}</p>}
      </div>
      {actiune && <div className="shrink-0">{actiune}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- BUTON */

type ButonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  fel?: "principal" | "moale" | "fantoma" | "pericol" | "reusita";
  marime?: "mic" | "normal" | "mare";
  incarca?: boolean;
};

export function Buton({ fel = "moale", marime = "normal", incarca, className = "", children, disabled, ...rest }: ButonProps) {
  const feluri = {
    principal: "bg-brand text-white hover:bg-brand/85 border-transparent shadow-[0_1px_0_rgba(255,255,255,.14)_inset]",
    moale: "bg-surface-3 text-ink border-line-strong hover:bg-surface-4",
    fantoma: "bg-transparent text-muted border-transparent hover:bg-surface-3 hover:text-ink",
    pericol: "bg-bad-dim text-bad border-bad/30 hover:bg-bad/20",
    reusita: "bg-ok-dim text-ok border-ok/30 hover:bg-ok/20",
  };
  const marimi = {
    mic: "h-8 px-2.5 text-[12.5px] gap-1.5 rounded-lg",
    normal: "h-9.5 px-3.5 text-[13.5px] gap-2 rounded-[var(--radius-field)]",
    mare: "h-11 px-5 text-[14.5px] gap-2 rounded-[var(--radius-field)]",
  };
  return (
    <button
      {...rest}
      disabled={disabled || incarca}
      className={`inline-flex select-none items-center justify-center border font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 ${feluri[fel]} ${marimi[marime]} ${className}`}
    >
      {incarca && <Rotitor />}
      {children}
    </button>
  );
}

export function Rotitor({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 ${className}`}
      aria-hidden
    />
  );
}

/* ---------------------------------------------------------------- BADGE */

export function Eticheta({ ton = "neutru", children, className = "" }: { ton?: Ton; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${TON_CLASE[ton]} ${className}`}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- PROGRES */

export function Bara({ procent, ton = "brand", inLucru }: { procent: number; ton?: Ton; inLucru?: boolean }) {
  const culori: Record<Ton, string> = {
    neutru: "bg-muted", brand: "bg-brand", ok: "bg-ok",
    warn: "bg-warn", risk: "bg-risk", bad: "bg-bad", info: "bg-info",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${culori[ton]} ${inLucru ? "shimmer" : ""}`}
        style={{ width: `${Math.max(2, Math.min(100, procent))}%` }}
      />
    </div>
  );
}

/**
 * Inelul de scor. Arata si valoarea, si increderea in date — pentru ca un scor
 * mare pe date incomplete nu inseamna un dosar curat, inseamna un dosar necitit.
 */
export function InelScor({ valoare, ton, marime = 92, eticheta }: { valoare: number; ton: Ton; marime?: number; eticheta?: string }) {
  const raza = (marime - 10) / 2;
  const circumferinta = 2 * Math.PI * raza;
  const culori: Record<Ton, string> = {
    neutru: "#98a2b3", brand: "#7c5cff", ok: "#2dd4a7",
    warn: "#f5a524", risk: "#ff7a45", bad: "#ff5a65", info: "#38bdf8",
  };
  return (
    <div className="relative shrink-0" style={{ width: marime, height: marime }}>
      <svg width={marime} height={marime} className="-rotate-90">
        <circle cx={marime / 2} cy={marime / 2} r={raza} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={5} />
        <circle
          cx={marime / 2} cy={marime / 2} r={raza} fill="none"
          stroke={culori[ton]} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumferinta}
          strokeDashoffset={circumferinta * (1 - Math.max(0, Math.min(100, valoare)) / 100)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-[19px] font-semibold leading-none text-ink">{valoare}<span className="text-[12px] text-faint">%</span></span>
        {eticheta && <span className="mt-0.5 text-[9.5px] uppercase tracking-wider text-faint">{eticheta}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ STARE GOALĂ */

export function Gol({ pictograma, titlu, text, actiune }: { pictograma?: React.ReactNode; titlu: string; text?: string; actiune?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-faint">
        {pictograma ?? <Ic.dosar className="h-5 w-5" />}
      </div>
      <p className="text-[14.5px] font-medium text-ink">{titlu}</p>
      {text && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-faint">{text}</p>}
      {actiune && <div className="mt-5">{actiune}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- PAGINAȚIE */

export function Paginare({
  pagina, pagini, total, numeElement = "elemente", peSchimbare,
}: {
  pagina: number; pagini: number; total: number; numeElement?: string;
  peSchimbare: (p: number) => void;
}) {
  if (pagini <= 1) {
    return total > 0 ? (
      <p className="px-5 py-3 text-[12.5px] text-faint">{total} {numeElement}</p>
    ) : null;
  }

  // Aratam maximum sapte numere: primele/ultimele si o fereastra in jurul celei
  // curente. La doi ani de dosare lunare, o bara cu 24 de numere n-ar incapea
  // pe telefon si n-ar ajuta pe nimeni.
  const numere: (number | "…")[] = [];
  const adauga = (n: number) => { if (!numere.includes(n)) numere.push(n); };
  adauga(1);
  if (pagina > 3) numere.push("…");
  for (let p = Math.max(2, pagina - 1); p <= Math.min(pagini - 1, pagina + 1); p++) adauga(p);
  if (pagina < pagini - 2) numere.push("…");
  adauga(pagini);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="tnum text-[12.5px] text-faint">
        {total} {numeElement} · pagina {pagina} din {pagini}
      </p>
      <div className="flex items-center gap-1">
        <Buton fel="fantoma" marime="mic" disabled={pagina <= 1} onClick={() => peSchimbare(pagina - 1)} aria-label="Pagina anterioară">
          <Ic.stanga className="h-3.5 w-3.5" />
        </Buton>
        {numere.map((n, i) =>
          n === "…" ? (
            <span key={`p${i}`} className="px-1.5 text-[12.5px] text-faint">…</span>
          ) : (
            <button
              key={n}
              onClick={() => peSchimbare(n)}
              aria-current={n === pagina ? "page" : undefined}
              className={`tnum h-8 min-w-8 rounded-lg px-2 text-[12.5px] font-medium transition-colors ${
                n === pagina ? "bg-brand text-white" : "text-muted hover:bg-surface-3 hover:text-ink"
              }`}
            >
              {n}
            </button>
          ),
        )}
        <Buton fel="fantoma" marime="mic" disabled={pagina >= pagini} onClick={() => peSchimbare(pagina + 1)} aria-label="Pagina următoare">
          <Ic.dreapta className="h-3.5 w-3.5" />
        </Buton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ FORMULARE */

export function Camp({ eticheta, obligatoriu, ajutor, children }: { eticheta: string; obligatoriu?: boolean; ajutor?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted">
        {eticheta}
        {obligatoriu && <span className="ml-1 text-bad">*</span>}
      </span>
      {children}
      {ajutor && <span className="mt-1.5 block text-[11.5px] text-faint">{ajutor}</span>}
    </label>
  );
}

/* --------------------------------------------------------------- DIVERSE */

export function Statistica({ valoare, eticheta, ton = "neutru", pictograma }: { valoare: React.ReactNode; eticheta: string; ton?: Ton; pictograma?: React.ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        {pictograma && <span className={`${TON_TEXT[ton]} opacity-80`}>{pictograma}</span>}
        <span className="tnum text-[22px] font-semibold leading-none tracking-tight text-ink">{valoare}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-faint">{eticheta}</p>
    </Card>
  );
}

export function Schelet({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg bg-surface-3 ${className}`} />;
}

