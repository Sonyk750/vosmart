"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { lipsuri, eticheta as etichetaTip } from "@/lib/cenzorat/documente";
import {
  ACCEPT, FORMATE_TEXT, LIMITA_FISIER_MB,
  esteAcceptat, esteArhiva, formatul, mimeDupaNume, sePoateDesface,
} from "@/lib/cenzorat/formate";
import { ETAPE, INDEX_ETAPA, type Etapa } from "@/lib/cenzorat/tipuri";
import { LUNI, numarLuna } from "@/lib/luni";
import { Bara, Buton, Card, Eticheta, Gol, Rotitor, Schelet } from "@/app/components/ui";
import { claseCamp, dataRo, type Ton } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";

/**
 * Încărcarea documentelor, pe luni.
 *
 * Ecranul e o LISTA DE LUNI, nu un formular. Sus alegi perioada si arunci
 * documentele; jos apare un rand pentru luna aceea, si de acolo incolo tot ce
 * faci cu dosarul faci din meniul randului: mai adaugi, vezi ce e inauntru,
 * scoti ce a intrat gresit, trimiti la verificare.
 *
 * Incarcarea NU porneste verificarea. Asociatia trimite in trei transe, iar o
 * citire la fiecare transa ar costa de trei ori si ar citi de doua ori un dosar
 * pe jumatate. Verificarea e o apasare separata, din meniul lunii, cand omul
 * spune ca dosarul e destul de plin.
 */

type FisierDinDosar = {
  id: string;
  numeFisier: string;
  tip: string;
  eticheta: string;
  mimeType: string;
  /** Cat ocupa in stocare, dupa recodare. */
  marime: number;
  /** Cat avea cand a fost trimis. Gol la fisierele intrate inainte de recodare. */
  marimeOriginala: number | null;
  /** sha256 al originalului — dovada a ce s-a primit. */
  amprenta: string | null;
  optimizat: boolean;
  /** Ce a citit modelul in document: „Factură Apa Nova". */
  denumireAi: string | null;
  emitentAi: string | null;
  perioadaAi: string | null;
  /** ai | nume | om — de unde vine tipul. */
  tipSursa: string;
  createdAt: string;
};

type Dosar = {
  id: string;
  luna: string;
  an: number;
  titlu: string | null;
  etapa: Etapa;
  stareEtapa: string;
  incredere: number | null;
  scor: number | null;
  verdict: string | null;
  rezumat: string | null;
  createdAt: string;
  updatedAt: string;
  fisiere: FisierDinDosar[];
};

type FisierAles = {
  id: string;
  fisier: File;
  /** Fisierele scoase dintr-o arhiva se marcheaza, ca omul sa stie de unde vin. */
  dinArhiva?: string;
  /** Ce s-a intamplat cu el la trimitere. */
  stare?: "asteapta" | "trimite" | "gata" | "esuat";
  /** Ce a citit modelul, dupa ce a plecat. */
  citit?: string;
  motiv?: string;
};

let contor = 0;
const idNou = () => `f${++contor}`;

const mb = (octeti: number) => octeti / 1024 / 1024;
const cuMajuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function kb(octeti: number): string {
  return octeti < 1024 * 1024
    ? `${Math.max(1, Math.round(octeti / 1024))} KB`
    : `${mb(octeti).toFixed(1)} MB`;
}

/**
 * Cat cantareste un dosar — primit fata de pastrat.
 *
 * `marimeOriginala` lipseste la fisierele intrate inainte de recodare; atunci
 * cade pe `marime`, deci raportul iese 1:1 si nu se afiseaza nicio sageata.
 */
function cantitate(fisiere: FisierDinDosar[]) {
  const primit = fisiere.reduce((s, f) => s + (f.marimeOriginala ?? f.marime), 0);
  const pastrat = fisiere.reduce((s, f) => s + f.marime, 0);
  return { primit, pastrat, strans: primit - pastrat };
}

/** Unde a ajuns dosarul, in cuvinte si in culoare. */
function stareDosar(d: Dosar): { text: string; ton: Ton; inLucru: boolean; procent: number } {
  const procent = ((INDEX_ETAPA[d.etapa] ?? 0) + 1) / ETAPE.length * 100;
  const numeEtapa = ETAPE.find(e => e.cheie === d.etapa)?.eticheta ?? d.etapa;

  if (d.stareEtapa === "esuata") return { text: "Verificare eșuată", ton: "bad", inLucru: false, procent };
  if (d.stareEtapa === "in_lucru") return { text: `${numeEtapa}…`, ton: "brand", inLucru: true, procent };
  if (d.etapa === "semnat") return { text: "Raport semnat", ton: "ok", inLucru: false, procent };
  if (d.etapa === "revizuire") return { text: "La cenzor", ton: "warn", inLucru: false, procent };
  if (d.etapa === "intrare") {
    return d.fisiere.length === 0
      ? { text: "Dosar gol", ton: "neutru", inLucru: false, procent: 0 }
      : { text: "Documente primite", ton: "info", inLucru: false, procent };
  }
  return { text: numeEtapa, ton: "info", inLucru: false, procent };
}

export default function IncarcareClient({ implicit }: { implicit: { luna: string; an: number } }) {
  const { ales } = useContract();

  const [luna, setLuna] = useState(String(numarLuna(implicit.luna) ?? 1).padStart(2, "0"));
  const [an, setAn] = useState(String(implicit.an));

  const [fisiere, setFisiere] = useState<FisierAles[]>([]);
  const [peste, setPeste] = useState(false);
  const [desface, setDesface] = useState(false);
  const [trimite, setTrimite] = useState(false);

  const [eroare, setEroare] = useState("");
  const [izbanda, setIzbanda] = useState("");

  const [deschis, setDeschis] = useState<string | null>(null);
  const [modSters, setModSters] = useState(false);
  const [lucreaza, setLucreaza] = useState<string | null>(null);

  // Lista se tine impreuna cu contractul pentru care a venit: la schimbarea
  // contractului, lunile vechi dispar in aceeasi randare in care se schimba bara
  // de sus, fara un `setState` in efect care sa le stearga cu o randare intarziere.
  const [lista, setLista] = useState<{ cheie: string; dosare: Dosar[] } | null>(null);
  const [reincarca, setReincarca] = useState(0);
  const intrare = useRef<HTMLInputElement>(null);

  const contractId = ales?.id ?? "";
  // Memorat, nu doar derivat: un `[]` nou la fiecare randare ar face `useMemo`-ul
  // totalului sa recalculeze mereu, adica sa nu memoreze nimic.
  const dosare = useMemo(
    () => (lista?.cheie === contractId ? lista.dosare : []),
    [lista, contractId],
  );
  const seIncarca = Boolean(contractId) && lista?.cheie !== contractId;
  const numeLunaAleasa = LUNI[parseInt(luna, 10) - 1];
  const dosarulLunii = dosare.find(d => d.luna === numeLunaAleasa && d.an === parseInt(an, 10));

  /* ------------------------------------------------------------ lunile */

  useEffect(() => {
    if (!contractId) return;

    const opreste = new AbortController();
    fetch(`/api/panou/dosare?contractId=${encodeURIComponent(contractId)}`, { signal: opreste.signal })
      .then(r => (r.ok ? r.json() : { dosare: [] }))
      // Si cand cererea pica scriem o lista goala pe cheia curenta: altfel
      // ecranul ar ramane pe schelete la nesfarsit.
      .catch(() => ({ dosare: [] }))
      .then(d => { if (!opreste.signal.aborted) setLista({ cheie: contractId, dosare: d?.dosare ?? [] }); });

    return () => opreste.abort();
  }, [contractId, reincarca]);

  // Cat timp un dosar e in lucru, ecranul se uita din nou din cand in cand.
  // Verificarea dureaza in jur de un minut si se intampla pe server, dupa ce
  // raspunsul a plecat; fara asta, omul ar sta pe o bara care nu se misca.
  // Cat ocupa tot contractul: intrebarea „cat ma costa stocarea?" se pune pe
  // contract, nu pe luna, iar raspunsul trebuie sa fie la vedere fara sa desfaci
  // fiecare rand in parte.
  const totalContract = useMemo(() => {
    const toate = dosare.flatMap(d => d.fisiere);
    return { documente: toate.length, ...cantitate(toate) };
  }, [dosare]);

  const inLucru = dosare.some(d => d.stareEtapa === "in_lucru");
  useEffect(() => {
    if (!inLucru) return;
    const ceas = setInterval(() => setReincarca(n => n + 1), 6000);
    return () => clearInterval(ceas);
  }, [inLucru]);

  /* --------------------------------------------------- primirea fisierelor */

  const adauga = useCallback(async (primite: File[]) => {
    setEroare("");
    setIzbanda("");
    const noi: FisierAles[] = [];
    const refuzate: string[] = [];

    for (const f of primite) {
      // O arhiva ZIP nu e un document: o desfacem aici si tratam ce e inauntru ca
      // si cum ar fi fost aruncat direct. RAR-ul nu se poate desface in browser,
      // deci ramane ca fisier — se pastreaza in dosar, dar nu intra in citire.
      if (sePoateDesface(f.name)) {
        setDesface(true);
        try {
          const { default: JSZip } = await import("jszip");
          const arhiva = await JSZip.loadAsync(f);
          for (const [cale, intrareArhiva] of Object.entries(arhiva.files)) {
            if (intrareArhiva.dir) continue;
            const numeScurt = cale.split("/").pop() || cale;
            if (numeScurt.startsWith(".") || esteArhiva(numeScurt)) continue;
            if (!esteAcceptat(numeScurt)) { refuzate.push(numeScurt); continue; }
            const octeti = await intrareArhiva.async("arraybuffer");
            noi.push({
              id: idNou(),
              fisier: new File([octeti], numeScurt, { type: mimeDupaNume(numeScurt) }),
              dinArhiva: f.name,
            });
          }
        } catch {
          refuzate.push(`${f.name} (arhiva nu a putut fi deschisă)`);
        }
        setDesface(false);
        continue;
      }

      if (!esteAcceptat(f.name)) { refuzate.push(f.name); continue; }
      noi.push({ id: idNou(), fisier: f });
    }

    if (refuzate.length > 0) setEroare(`Nu s-au putut prelua: ${refuzate.join(", ")}. Se primesc ${FORMATE_TEXT}.`);
    if (noi.length > 0) setFisiere(p => [...p, ...noi]);
  }, []);

  const scoate = (id: string) => setFisiere(p => p.filter(f => f.id !== id));

  const octeti = fisiere.reduce((s, f) => s + f.fisier.size, 0);
  // Ce nu poate fi micsorat in browser si tot nu incape intr-o cerere: un PDF
  // mare. Se spune pe nume, nu se lasa sa cada intr-o eroare generica.
  const preaGrele = fisiere.filter(
    f => f.fisier.size > LIMITA_FISIER_MB * 1024 * 1024 && !f.fisier.type.startsWith("image/"),
  );
  const necitibile = fisiere.filter(f => !formatul(f.fisier.name)?.citibilDeAi);
  const inchisaLuna = dosarulLunii?.etapa === "semnat";
  const potTrimite = Boolean(contractId) && fisiere.length > 0 && preaGrele.length === 0 && !inchisaLuna;

  /* ------------------------------------------------------------- acțiuni */

  /**
   * Micsoreaza o imagine in browser, cand nu ar incapea intr-o cerere.
   *
   * Serverul recodeaza oricum tot ce primeste, dar o poza de telefon de 7 MB
   * n-ar ajunge PANA la server: platforma taie cererea la 4,5 MB. Deci prima
   * micsorare se face aici, exact la aceeasi latura ca pe server, ca sa nu iasa
   * doua rezultate diferite pentru acelasi document.
   */
  async function micsoreaza(f: File): Promise<File> {
    if (!f.type.startsWith("image/") || f.size <= LIMITA_FISIER_MB * 1024 * 1024) return f;
    try {
      const imagine = await createImageBitmap(f);
      const scara = Math.min(1, 2400 / Math.max(imagine.width, imagine.height));
      const panza = new OffscreenCanvas(Math.round(imagine.width * scara), Math.round(imagine.height * scara));
      const ctx = panza.getContext("2d");
      if (!ctx) return f;
      // Fundal alb intai: un PNG transparent desenat direct ar iesi cu fundal negru.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, panza.width, panza.height);
      ctx.drawImage(imagine, 0, 0, panza.width, panza.height);
      imagine.close();
      const bucata = await panza.convertToBlob({ type: "image/jpeg", quality: 0.82 });
      return bucata.size < f.size
        ? new File([bucata], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
        : f;
    } catch {
      // Browser fara OffscreenCanvas: pleaca asa cum e si serverul spune de ce nu merge.
      return f;
    }
  }

  /**
   * Trimite teancul, UN FISIER PE CERERE.
   *
   * Nu din eleganta: platforma respinge orice cerere peste 4,5 MB inainte ca
   * ruta sa fie chemata, iar treizeci de facturi intr-un `FormData` treceau lejer
   * de limita. Asa se vedea „documentele nu au putut fi trimise", fara motiv —
   * codul nostru nici nu apucase sa ruleze.
   *
   * Fisier cu fisier inseamna si ca o factura stricata nu mai darama tot teancul:
   * ea ramane rosie in lista, restul intra in dosar.
   */
  async function incarcaInDosar() {
    if (!potTrimite || trimite) return;
    setTrimite(true);
    setEroare("");
    setIzbanda("");

    const deTrimis = fisiere.filter(f => f.stare !== "gata");
    let intrate = 0, primiti = 0, pastrati = 0, cost = 0;
    const cazute: string[] = [];

    for (const f of deTrimis) {
      setFisiere(p => p.map(x => (x.id === f.id ? { ...x, stare: "trimite", motiv: undefined } : x)));
      try {
        const bucata = await micsoreaza(f.fisier);
        const date = new FormData();
        date.append("contractId", contractId);
        date.append("luna", numeLunaAleasa);
        date.append("an", an);
        date.append("porneste", "0");
        date.append("fisiere", bucata, bucata.name);
        // „auto" = nu impune nimic; tipul iese din citirea documentului.
        date.append("tipuri", "auto");

        const r = await fetch("/api/panou/dosare", { method: "POST", body: date });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(
            d.error
            // 413 vine de la platforma, nu de la noi: raspunsul e o pagina de
            // text, nu JSON, deci `d.error` lipseste. Traducem noi.
            || (r.status === 413 ? `prea mare pentru o cerere (peste ${LIMITA_FISIER_MB} MB)` : `eroare ${r.status}`),
          );
        }

        intrate += d.primite ?? 1;
        primiti += d.octetiPrimiti ?? 0;
        pastrati += d.octetiPastrati ?? 0;
        cost += d.inventar?.cost ?? 0;
        const citit = d.inventar?.denumiri?.[0] as string | undefined;
        setFisiere(p => p.map(x => (x.id === f.id ? { ...x, stare: "gata", citit } : x)));
      } catch (e) {
        cazute.push(f.fisier.name);
        setFisiere(p => p.map(x => (x.id === f.id
          ? { ...x, stare: "esuat", motiv: e instanceof Error ? e.message : "nu a putut fi trimis" }
          : x)));
      }
    }

    if (intrate > 0) {
      const strans = primiti - pastrati;
      setIzbanda(
        `${intrate} ${intrate === 1 ? "document a intrat" : "documente au intrat"} în dosarul pe ${numeLunaAleasa} ${an}.`
        + (strans > 256 * 1024 ? ` ${kb(primiti)} primite → ${kb(pastrati)} pe server.` : "")
        + (cost > 0 ? ` Citirea documentelor: $${cost.toFixed(3)}.` : ""),
      );
      setDeschis(null);
      setReincarca(n => n + 1);
    }
    if (cazute.length > 0) {
      setEroare(`${cazute.length} ${cazute.length === 1 ? "document nu a intrat" : "documente nu au intrat"}: ${cazute.join(", ")}. Vezi motivul în dreptul fiecăruia.`);
    }
    setTrimite(false);
  }

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

  /** „Adaugă documente" din meniul unei luni: aduce perioada sus si deschide alegerea. */
  function adaugaLa(dosar: Dosar) {
    setLuna(String(numarLuna(dosar.luna) ?? 1).padStart(2, "0"));
    setAn(String(dosar.an));
    setEroare("");
    setIzbanda("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    intrare.current?.click();
  }

  /* ----------------------------------------------------------------- ecran */

  if (!ales) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">Încarcă documente</h1>
        <Card className="mt-5 px-5 py-6">
          <p className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <Ic.info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
            Documentele intră într-un dosar, iar dosarul stă sub un contract. Nu există încă
            niciun contract, deci nu are unde să intre nimic.
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
          <h1 className="text-[22px] font-semibold tracking-tight">Încarcă documente</h1>
          <p className="mt-1 text-[13px] text-faint">
            Dosarele lunare ale contractului <span className="text-muted">{ales.denumire}</span>.
          </p>
        </div>
        <p className="text-[12px] text-faint">
          Termen lunar: ziua <span className="tnum text-muted">{ales.ziTermen}</span>
        </p>
      </div>

      {/* ------------------------------------------------------- PAS 1: luna */}

      <Card
        className={`mt-5 overflow-hidden transition-colors ${peste ? "border-brand bg-brand-dim/40" : ""}`}
        onDragOver={e => { e.preventDefault(); setPeste(true); }}
        onDragLeave={() => setPeste(false)}
        onDrop={e => { e.preventDefault(); setPeste(false); adauga(Array.from(e.dataTransfer.files)); }}
      >
        <div className="flex flex-wrap items-end gap-4 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Luna documentelor</span>
            <select value={luna} onChange={e => setLuna(e.target.value)} className={`${claseCamp} w-40`}>
              {LUNI.map((l, i) => (
                <option key={l} value={String(i + 1).padStart(2, "0")}>{cuMajuscula(l)}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Anul</span>
            <select value={an} onChange={e => setAn(e.target.value)} className={`${claseCamp} w-28`}>
              {[0, 1, 2, 3].map(i => {
                const y = implicit.an + 1 - i;
                return <option key={y} value={String(y)}>{y}</option>;
              })}
            </select>
          </label>

          <div className="flex-1" />

          <input
            ref={intrare} type="file" multiple hidden accept={ACCEPT}
            onChange={e => { adauga(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          />
          <Buton fel="principal" marime="mare" disabled={inchisaLuna} incarca={desface}
            onClick={() => intrare.current?.click()}>
            {!desface && <Ic.sus className="h-4 w-4" />}
            {desface ? "Se desface arhiva…" : "Încarcă documente"}
          </Buton>
        </div>

        <div className="border-t border-line bg-surface-1 px-5 py-2.5">
          <p className="text-[11.5px] leading-relaxed text-faint">
            {inchisaLuna ? (
              <span className="text-warn">
                Dosarul pe {numeLunaAleasa} {an} are raport semnat și nu mai primește documente. Alege altă lună.
              </span>
            ) : (
              <>
                Unul sau mai multe deodată — sau trage-le direct aici. {FORMATE_TEXT}. Nu alege tu
                ce sunt: fiecare document e deschis și citit, iar în inventar apare cu numele lui
                („Factură Apa Nova”), nu cu cel al fișierului. Arhiva ZIP o deschidem noi.
              </>
            )}
          </p>
        </div>

        {/* Ce e pregătit de trimis */}
        {fisiere.length > 0 && (
          <div className="rise border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-1 px-5 py-2.5">
              <p className="text-[12.5px] font-medium text-ink">
                {fisiere.length} {fisiere.length === 1 ? "document pregătit" : "documente pregătite"}
                <span className="ml-2 font-normal text-faint">{mb(octeti).toFixed(1)} MB</span>
              </p>
              <Buton fel="fantoma" marime="mic" onClick={() => setFisiere([])}>Golește</Buton>
            </div>

            <ul className="divide-y divide-line">
              {fisiere.map(f => {
                const format = formatul(f.fisier.name);
                const greu = f.fisier.size > LIMITA_FISIER_MB * 1024 * 1024 && !f.fisier.type.startsWith("image/");
                return (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                    <span className="shrink-0">
                      {f.stare === "trimite" ? <Rotitor className="h-4 w-4 text-brand-soft" />
                        : f.stare === "gata" ? <Ic.bifa className="h-4 w-4 text-ok" />
                          : f.stare === "esuat" || greu ? <Ic.alerta className="h-4 w-4 text-bad" />
                            : <Ic.fisier className="h-4 w-4 text-faint" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink">
                        {f.citit ?? f.fisier.name}
                      </p>
                      <p className="truncate text-[11.5px] text-faint">
                        {f.citit && <span className="text-faint/80">{f.fisier.name} · </span>}
                        {format?.eticheta} · {kb(f.fisier.size)}
                        {f.dinArhiva && ` · din ${f.dinArhiva}`}
                        {format && !format.citibilDeAi && " · nu poate fi citit de AI"}
                      </p>
                      {(f.motiv || greu) && (
                        <p className="text-[11.5px] text-bad">
                          {f.motiv ?? `prea mare pentru o cerere — limita e ${LIMITA_FISIER_MB} MB pe fișier`}
                        </p>
                      )}
                    </div>
                    {f.stare === "gata" && <Eticheta ton="ok">în dosar</Eticheta>}
                    <button onClick={() => scoate(f.id)} aria-label={`Scoate ${f.fisier.name}`}
                      className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-bad">
                      <Ic.x className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-1 px-5 py-3">
              <Buton fel="principal" incarca={trimite} disabled={!potTrimite} onClick={incarcaInDosar}>
                {!trimite && <Ic.jos className="h-4 w-4" />}
                {trimite ? "Se încarcă…" : `Adaugă în dosarul pe ${numeLunaAleasa} ${an}`}
              </Buton>
              {preaGrele.length > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-bad">
                  <Ic.alerta className="h-3.5 w-3.5" />
                  {preaGrele.length} {preaGrele.length === 1 ? "fișier depășește" : "fișiere depășesc"} {LIMITA_FISIER_MB} MB — scoate-le din listă
                </span>
              )}
              {necitibile.length > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-faint">
                  <Ic.info className="h-3.5 w-3.5" />
                  {necitibile.length} se păstrează, dar nu intră în citirea AI
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

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

      {/* ------------------------------------------------------- PAS 2: lunile */}

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
                deschis={deschis === d.id}
                modSters={deschis === d.id && modSters}
                lucreaza={lucreaza}
                peComuta={(sters: boolean) => {
                  const acelasi = deschis === d.id;
                  setDeschis(acelasi && modSters === sters ? null : d.id);
                  setModSters(sters);
                }}
                peAdauga={() => adaugaLa(d)}
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
  dosar, deschis, modSters, lucreaza, peComuta, peAdauga, pePornire, peStergere,
}: {
  dosar: Dosar;
  deschis: boolean;
  modSters: boolean;
  lucreaza: string | null;
  peComuta: (modSters: boolean) => void;
  peAdauga: () => void;
  pePornire: () => void;
  peStergere: (f: FisierDinDosar) => void;
}) {
  const [meniu, setMeniu] = useState(false);
  const stare = stareDosar(dosar);
  const cat = cantitate(dosar.fisiere);
  const semnat = dosar.etapa === "semnat";

  const lipsa = useMemo(() => lipsuri(dosar.fisiere.map(f => f.tip)), [dosar.fisiere]);

  const actiune = (fn: () => void) => () => { setMeniu(false); fn(); };

  return (
    <li>
      <Card className="overflow-hidden">
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
                  <ElementMeniu pictograma={<Ic.scanteie className="h-3.5 w-3.5" />}
                    dezactivat={semnat || dosar.fisiere.length === 0 || stare.inLucru}
                    peApasare={actiune(pePornire)}>
                    Trimite la verificare AI
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
          <div className="rise border-t border-line">
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
                    <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                      <Ic.fisier className="h-4 w-4 shrink-0 text-faint" />
                      <div className="min-w-0 flex-1">
                        {/* Ce a citit modelul e numele principal. Tipul si numele
                            fisierului stau dedesubt: felul documentului si de unde
                            a venit, amandoua utile, dar niciunul nu e „cum se
                            cheama documentul asta". */}
                        <p className="truncate text-[13px] text-ink">
                          {f.denumireAi || f.eticheta || etichetaTip(f.tip)}
                        </p>
                        <p className="truncate text-[11.5px] text-faint">
                          {f.denumireAi && <span>{etichetaTip(f.tip)} · </span>}
                          {f.numeFisier} · {f.optimizat && f.marimeOriginala
                            ? `${kb(f.marimeOriginala)} → ${kb(f.marime)}`
                            : kb(f.marime)}
                          {!formatul(f.numeFisier)?.citibilDeAi && " · nu intră în citirea AI"}
                        </p>
                        {f.tipSursa === "nume" && (
                          <p className="text-[11px] text-warn/80">
                            nu a putut fi citit — tipul e ghicit din numele fișierului
                          </p>
                        )}
                        {f.amprenta && (
                          <p className="truncate font-mono text-[10px] text-faint/70"
                            title={`sha256 al fișierului original: ${f.amprenta}`}>
                            {f.optimizat ? "recodat · " : ""}amprentă {f.amprenta.slice(0, 16)}…
                          </p>
                        )}
                      </div>
                      <a
                        href={`/api/panou/fisiere/${f.id}?inline=1`}
                        target="_blank" rel="noreferrer"
                        title="Deschide documentul"
                        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                      >
                        <Ic.cauta className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/api/panou/fisiere/${f.id}`}
                        title="Descarcă documentul"
                        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                      >
                        <Ic.descarca className="h-3.5 w-3.5" />
                      </a>
                      {!semnat && (
                        <button
                          onClick={() => peStergere(f)}
                          disabled={lucreaza === f.id}
                          title={`Scoate ${f.numeFisier} din dosar`}
                          className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-bad-dim hover:text-bad disabled:opacity-40"
                        >
                          {lucreaza === f.id ? <Rotitor className="h-3.5 w-3.5" /> : <Ic.cos className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </li>
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
