"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { TIPURI, ghicesteTip, lipsuri, tip as tipDupaCheie } from "@/lib/cenzorat/documente";
import { Buton, Camp, Card, CardCap, claseCamp, Eticheta, Rotitor } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";

/**
 * Trimiterea unui dosar la verificare.
 *
 * Ecranul vechi punea douasprezece casute de fisier una sub alta, fiecare cu
 * butonul ei „Alege fișier...", plus un tab separat pentru arhive ZIP, plus o
 * bara colorata cu 30 de liniute. Omul trebuia sa stie dinainte care fisier
 * merge in care casuta.
 *
 * Aici e o singura zona: arunci tot ce ai — fisiere, o gramada de facturi, o
 * arhiva — iar tipul se ghiceste din numele fisierului. Ce n-a fost recunoscut
 * se vede imediat, cu un semn, si se corecteaza dintr-o lista. Iar lista din
 * dreapta spune tot timpul CE MAI LIPSESTE ca dosarul sa fie complet, in loc sa
 * afle omul abia dupa ce apasa trimite.
 */

type FisierAles = {
  id: string;
  fisier: File;
  cheie: string;
  incredere: "sigur" | "probabil" | "necunoscut";
  /** Fisierele scoase dintr-o arhiva se marcheaza, ca omul sa stie de unde vin. */
  dinArhiva?: string;
};

const EXT_ACCEPTATE = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const LIMITA_MB = 20;

let contor = 0;
const idNou = () => `f${++contor}`;

const LUNI = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

function mime(nume: string): string {
  const ext = nume.slice(nume.lastIndexOf(".")).toLowerCase();
  return { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext] ?? "";
}

export default function DosarNou({
  numeImplicit, doarDeBaza, blocat, motivBlocare, peTrimis,
}: {
  numeImplicit?: string;
  /** Contul Trial nu primeste tipurile extinse. */
  doarDeBaza: boolean;
  blocat: boolean;
  motivBlocare?: string;
  peTrimis: (dosarId: string) => void;
}) {
  const acum = new Date();
  const [nume, setNume] = useState(numeImplicit ?? "");
  const [luna, setLuna] = useState(String(acum.getMonth() === 0 ? 12 : acum.getMonth()).padStart(2, "0"));
  const [an, setAn] = useState(String(acum.getMonth() === 0 ? acum.getFullYear() - 1 : acum.getFullYear()));
  const [fisiere, setFisiere] = useState<FisierAles[]>([]);
  const [peste, setPeste] = useState(false);
  const [desface, setDesface] = useState(false);
  const [trimite, setTrimite] = useState(false);
  const [eroare, setEroare] = useState("");
  const intrare = useRef<HTMLInputElement>(null);

  const tipuriPermise = useMemo(() => TIPURI.filter(t => !doarDeBaza || !t.extins), [doarDeBaza]);

  const adauga = useCallback(async (lista: File[]) => {
    setEroare("");
    const noi: FisierAles[] = [];

    for (const f of lista) {
      const numeMic = f.name.toLowerCase();

      // O arhiva nu e un document: o desfacem si tratam ce e inauntru ca si cum
      // ar fi fost aruncat direct. Asa nu mai e nevoie de un tab separat pentru ZIP.
      if (numeMic.endsWith(".zip")) {
        setDesface(true);
        try {
          const arhiva = await JSZip.loadAsync(f);
          for (const [cale, intrareArhiva] of Object.entries(arhiva.files)) {
            if (intrareArhiva.dir) continue;
            const numeScurt = cale.split("/").pop() || cale;
            if (!EXT_ACCEPTATE.some(e => numeScurt.toLowerCase().endsWith(e))) continue;
            const octeti = await intrareArhiva.async("arraybuffer");
            const tipMime = mime(numeScurt);
            const fisierNou = new File([octeti], numeScurt, { type: tipMime });
            const ghicit = ghicesteTip(numeScurt);
            noi.push({ id: idNou(), fisier: fisierNou, cheie: ghicit.cheie, incredere: ghicit.incredere, dinArhiva: f.name });
          }
        } catch {
          setEroare(`Arhiva „${f.name}" nu a putut fi deschisă.`);
        }
        setDesface(false);
        continue;
      }

      if (!EXT_ACCEPTATE.some(e => numeMic.endsWith(e))) {
        setEroare(`„${f.name}" nu e acceptat. Trimiteți PDF sau imagini (PNG, JPG, WEBP).`);
        continue;
      }
      const ghicit = ghicesteTip(f.name);
      noi.push({ id: idNou(), fisier: f, cheie: ghicit.cheie, incredere: ghicit.incredere });
    }

    if (noi.length > 0) setFisiere(p => [...p, ...noi]);
  }, []);

  const scoate = (id: string) => setFisiere(p => p.filter(f => f.id !== id));
  const schimbaTip = (id: string, cheie: string) =>
    setFisiere(p => p.map(f => (f.id === id ? { ...f, cheie, incredere: "sigur" } : f)));

  const megaocteti = fisiere.reduce((s, f) => s + f.fisier.size, 0) / 1024 / 1024;
  const lipsa = lipsuri(fisiere.map(f => f.cheie));
  const nerecunoscute = fisiere.filter(f => f.cheie === "altele" || f.incredere === "necunoscut");
  const preaMare = megaocteti > LIMITA_MB;
  const gata = fisiere.length > 0 && lipsa.length === 0 && nerecunoscute.length === 0 && !preaMare && nume.trim().length > 1;

  async function trimiteDosarul() {
    if (!gata || trimite) return;
    setTrimite(true);
    setEroare("");

    const date = new FormData();
    date.append("period", `${an}-${luna}`);
    date.append("associationName", nume.trim());
    for (const f of fisiere) {
      date.append("files", f.fisier);
      date.append("fileTypes", f.cheie);
      date.append("fileLabels", tipDupaCheie(f.cheie)?.eticheta ?? f.cheie);
    }

    try {
      const raspuns = await fetch("/api/dashboard/upload-structured", { method: "POST", body: date });
      const rezultat = await raspuns.json();
      if (!raspuns.ok) throw new Error(rezultat.error || "Dosarul nu a putut fi trimis.");
      setFisiere([]);
      peTrimis(rezultat.documentId);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Dosarul nu a putut fi trimis.");
    } finally {
      setTrimite(false);
    }
  }

  if (blocat) {
    return (
      <Card className="border-bad/25 bg-bad-dim/40 px-5 py-6">
        <div className="flex items-start gap-3">
          <Ic.alerta className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
          <div>
            <p className="text-[14px] font-medium text-ink">Nu se pot trimite dosare noi</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{motivBlocare}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* ------------------------------------------------- coloana stângă */}
      <div className="space-y-4">
        <Card>
          <CardCap titlu="Dosar nou" sub="Perioada verificată și asociația pentru care se face verificarea." />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto]">
            <Camp eticheta="Asociația" obligatoriu>
              <input
                value={nume} onChange={e => setNume(e.target.value)}
                placeholder="ex. Asociația de Proprietari Bloc 12, Sc. B"
                className={claseCamp}
              />
            </Camp>
            <Camp eticheta="Perioada" obligatoriu>
              <div className="flex gap-2">
                <select value={luna} onChange={e => setLuna(e.target.value)} className={`${claseCamp} w-36`}>
                  {LUNI.map((l, i) => (
                    <option key={l} value={String(i + 1).padStart(2, "0")}>{l}</option>
                  ))}
                </select>
                <select value={an} onChange={e => setAn(e.target.value)} className={`${claseCamp} w-24`}>
                  {[0, 1, 2, 3].map(i => {
                    const y = acum.getFullYear() - i;
                    return <option key={y} value={String(y)}>{y}</option>;
                  })}
                </select>
              </div>
            </Camp>
          </div>
        </Card>

        {/* Zona unde se arunca tot */}
        <div
          onDragOver={e => { e.preventDefault(); setPeste(true); }}
          onDragLeave={() => setPeste(false)}
          onDrop={e => { e.preventDefault(); setPeste(false); adauga(Array.from(e.dataTransfer.files)); }}
          onClick={() => intrare.current?.click()}
          role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") intrare.current?.click(); }}
          className={`cursor-pointer rounded-[var(--radius-card)] border-2 border-dashed px-6 py-10 text-center transition-colors ${
            peste ? "border-brand bg-brand-dim" : "border-line-strong bg-surface-1 hover:border-brand/50 hover:bg-surface-2"
          }`}
        >
          <input
            ref={intrare} type="file" multiple hidden
            accept={[...EXT_ACCEPTATE, ".zip"].join(",")}
            onChange={e => { adauga(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          />
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-muted">
            {desface ? <Rotitor className="h-4 w-4" /> : <Ic.sus className="h-5 w-5" />}
          </div>
          <p className="text-[14.5px] font-medium text-ink">
            {desface ? "Se desface arhiva…" : "Aruncă aici tot dosarul"}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-faint">
            Toate documentele deodată, în orice ordine — inclusiv o arhivă ZIP. Recunoaștem
            fiecare document după nume și îl așezăm la locul lui.
          </p>
        </div>

        {/* Ce a fost primit */}
        {fisiere.length > 0 && (
          <Card>
            <CardCap
              titlu={`${fisiere.length} ${fisiere.length === 1 ? "document" : "documente"}`}
              sub={`${megaocteti.toFixed(1)} MB din ${LIMITA_MB} MB`}
              actiune={
                <Buton fel="fantoma" marime="mic" onClick={() => setFisiere([])}>
                  Golește
                </Buton>
              }
            />
            <ul className="divide-y divide-line">
              {fisiere.map(f => {
                const necunoscut = f.cheie === "altele";
                return (
                  <li key={f.id} className="rise flex items-center gap-3 px-5 py-2.5">
                    <Ic.fisier className={`h-4 w-4 shrink-0 ${necunoscut ? "text-warn" : "text-faint"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink">{f.fisier.name}</p>
                      <p className="text-[11.5px] text-faint">
                        {(f.fisier.size / 1024).toFixed(0)} KB
                        {f.dinArhiva && ` · din ${f.dinArhiva}`}
                        {f.incredere === "probabil" && !necunoscut && " · potrivire probabilă, verifică"}
                      </p>
                    </div>
                    <select
                      value={f.cheie}
                      onChange={e => schimbaTip(f.id, e.target.value)}
                      className={`w-48 shrink-0 rounded-lg border bg-surface-1 px-2 py-1.5 text-[12.5px] outline-none transition-colors focus:border-brand/60 ${
                        necunoscut ? "border-warn/50 text-warn" : "border-line-strong text-muted"
                      }`}
                    >
                      <option value="altele">— alege tipul —</option>
                      {tipuriPermise.map(t => (
                        <option key={t.cheie} value={t.cheie}>{t.eticheta}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => scoate(f.id)}
                      aria-label={`Scoate ${f.fisier.name}`}
                      className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-bad"
                    >
                      <Ic.x className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {eroare && (
          <Card className="border-bad/30 bg-bad-dim/50 px-4 py-3">
            <p className="flex items-start gap-2 text-[13px] text-bad">
              <Ic.alerta className="mt-0.5 h-4 w-4 shrink-0" />
              {eroare}
            </p>
          </Card>
        )}
      </div>

      {/* ------------------------------------------------- coloana dreaptă */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardCap titlu="Ce trebuie să conțină dosarul" />
          <ul className="space-y-0.5 px-3 py-3">
            {TIPURI.filter(t => !doarDeBaza || !t.extins).map(t => {
              const cate = fisiere.filter(f => f.cheie === t.cheie).length;
              const necesar = t.minim ?? 1;
              const complet = t.obligatoriu ? cate >= necesar : cate > 0;
              return (
                <li key={t.cheie} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5" title={t.explicatie}>
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    complet ? "border-ok/50 bg-ok-dim text-ok"
                    : t.obligatoriu ? "border-bad/40 bg-bad-dim text-bad"
                    : "border-line-strong text-faint"
                  }`}>
                    {complet ? <Ic.bifa className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] leading-tight ${complet ? "text-ink" : "text-muted"}`}>
                      {t.eticheta}
                      {t.obligatoriu && !complet && <span className="ml-1 text-bad">*</span>}
                    </span>
                    <span className="text-[11px] text-faint">
                      {cate > 0
                        ? `${cate} ${cate === 1 ? "fișier" : "fișiere"}${t.minim && t.minim > 1 ? ` din minimum ${t.minim}` : ""}`
                        : t.obligatoriu ? "obligatoriu" : "opțional"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {doarDeBaza && (
            <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-faint">
              Contul Trial acoperă documentele de bază. Registrele și anexele intră în
              verificare la planurile plătite.
            </p>
          )}
        </Card>

        <Card className="px-4 py-4">
          {nerecunoscute.length > 0 && (
            <p className="mb-3 flex items-start gap-2 text-[12.5px] text-warn">
              <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {nerecunoscute.length} {nerecunoscute.length === 1 ? "document nu a fost recunoscut" : "documente nu au fost recunoscute"} — alege tipul din listă.
            </p>
          )}
          {lipsa.length > 0 && fisiere.length > 0 && (
            <p className="mb-3 flex items-start gap-2 text-[12.5px] text-muted">
              <Ic.info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Mai lipsește: {lipsa.join(", ")}.
            </p>
          )}
          {preaMare && (
            <p className="mb-3 flex items-start gap-2 text-[12.5px] text-bad">
              <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Dosarul are {megaocteti.toFixed(1)} MB, peste limita de {LIMITA_MB} MB.
            </p>
          )}
          <Buton fel="principal" marime="mare" className="w-full" disabled={!gata} incarca={trimite} onClick={trimiteDosarul}>
            {!trimite && <Ic.scut className="h-4 w-4" />}
            {trimite ? "Se trimite…" : "Trimite la verificare"}
          </Buton>
          <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-faint">
            Verificarea durează în jur de un minut. Poți închide pagina —
            dosarul își vede de treabă.
          </p>
        </Card>

        <div className="flex flex-wrap gap-1.5 px-1">
          <Eticheta ton="neutru">Stocare privată</Eticheta>
          <Eticheta ton="neutru">PDF · PNG · JPG</Eticheta>
        </div>
      </div>
    </div>
  );
}
