"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TIPURI, lipsuri, eticheta as etichetaTip } from "@/lib/cenzorat/documente";
import {
  ACCEPT, FORMATE_TEXT, LIMITA_FISIER_MB,
  esteAcceptat, esteArhiva, formatul, mimeDupaNume, sePoateDesface,
} from "@/lib/cenzorat/formate";
import { LUNI, numarLuna } from "@/lib/luni";
import { Bara, Buton, Card, Eticheta, Gol, Rotitor, Schelet } from "@/app/components/ui";
import { claseCamp, dataRo } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useContract } from "../ContractContext";
import {
  cantitate, cuMajuscula, deCitit, kb, mb, stareDosar,
  type DosarLunar as Dosar, type FisierDinDosar,
} from "../dosare";

/** Un fisier ales de om, inainte sa plece spre dosar. */
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

/**
 * Fisierele dintr-un „drop", inclusiv cand s-a tras un FOLDER.
 *
 * `dataTransfer.files` e gol la un folder: acolo vine o intrare de director, iar
 * continutul se citeste recursiv prin `webkitGetAsEntry`. Conteaza fiindca
 * dosarul unei luni sta, la administrator, intr-un folder — iar altfel omul
 * ramane sa aleaga douazeci de fisiere cu mana.
 */
async function fisiereDinDrop(dt: DataTransfer): Promise<File[]> {
  const intrari = Array.from(dt.items)
    .map(i => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((i): i is FileSystemEntry => Boolean(i));

  // Browser fara API-ul de intrari: macar fisierele simple.
  if (intrari.length === 0) return Array.from(dt.files);

  const gasite: File[] = [];

  async function coboara(intrare: FileSystemEntry) {
    if (intrare.isFile) {
      const f = await new Promise<File | null>(gata =>
        (intrare as FileSystemFileEntry).file(gata, () => gata(null)));
      if (f) gasite.push(f);
      return;
    }
    if (!intrare.isDirectory) return;

    // `readEntries` intoarce cel mult o suta de intrari odata; se cheama pana
    // raspunde gol. Fara bucla, un folder cu 150 de facturi ar pierde 50.
    const cititor = (intrare as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const lot = await new Promise<FileSystemEntry[]>(gata =>
        cititor.readEntries(gata, () => gata([])));
      if (lot.length === 0) break;
      for (const x of lot) await coboara(x);
    }
  }

  for (const i of intrari) await coboara(i);
  return gasite;
}

export default function IncarcareClient({
  implicit, intocmitDe,
}: {
  implicit: { luna: string; an: number };
  /** Numele cenzorului, pentru inventarul tiparit. */
  intocmitDe: string;
}) {
  const { ales } = useContract();

  const [luna, setLuna] = useState(String(numarLuna(implicit.luna) ?? 1).padStart(2, "0"));
  const [an, setAn] = useState(String(implicit.an));

  const [fisiere, setFisiere] = useState<FisierAles[]>([]);
  const [peste, setPeste] = useState(false);
  const [desface, setDesface] = useState(false);
  const [trimite, setTrimite] = useState(false);
  const [progres, setProgres] = useState({ gata: 0, total: 0 });

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
  const intrareFolder = useRef<HTMLInputElement>(null);

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

  // Functie simpla, nu `useCallback`: are nevoie de luna, anul si contractul de
  // ACUM. Memorata cu lista goala de dependinte, ar fi trimis documentele in luna
  // aleasa la prima randare, oricat le-ai fi schimbat pe urma.
  async function adauga(primite: File[]) {
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
    if (noi.length > 0) {
      setFisiere(p => [...p, ...noi]);
      // Pleaca imediat, fara al doilea buton. Confirmarea era o inventie a mea, si
      // una scumpa: la douazeci de fisiere butonul ajungea sub lista, iar omul
      // ramanea uitandu-se la niste nume de fisier fara inteles, convins ca
      // aplicatia nu face nimic. Ce e gresit se scoate din dosar dupa aceea.
      void trimiteTeanc(noi);
    }
  }

  const scoate = (id: string) => setFisiere(p => p.filter(f => f.id !== id));

  const octeti = fisiere.reduce((s, f) => s + f.fisier.size, 0);
  const necitibile = fisiere.filter(f => !formatul(f.fisier.name)?.citibilDeAi);
  const nedeschise = fisiere.filter(f => !formatul(f.fisier.name)?.inventariabil);
  const cazute = fisiere.filter(f => f.stare === "esuat");
  const intrateTot = fisiere.filter(f => f.stare === "gata").length;
  const inchisaLuna = dosarulLunii?.etapa === "semnat";

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
  async function trimiteTeanc(teanc: FisierAles[]) {
    if (!contractId || teanc.length === 0 || inchisaLuna) return;
    setTrimite(true);
    setEroare("");
    setIzbanda("");

    // Ce nu incape intr-o cerere cade din start, fara drum degeaba pana la server.
    const deTrimis = teanc.filter(f => {
      const greu = f.fisier.size > LIMITA_FISIER_MB * 1024 * 1024 && !f.fisier.type.startsWith("image/");
      if (greu) {
        setFisiere(p => p.map(x => (x.id === f.id
          ? { ...x, stare: "esuat", motiv: `${kb(f.fisier.size)} — peste limita de ${LIMITA_FISIER_MB} MB pe fișier` }
          : x)));
      }
      return !greu;
    });
    if (deTrimis.length === 0) { setTrimite(false); return; }

    let intrate = 0, primiti = 0, pastrati = 0, cost = 0, terminate = 0;
    let dosarId: string | null = null;
    const cazute: string[] = [];
    setProgres({ gata: 0, total: deTrimis.length });

    async function trimiteUnul(f: FisierAles) {
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

        dosarId = d.dosarId ?? dosarId;
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
      } finally {
        terminate++;
        setProgres({ gata: terminate, total: deTrimis.length });
      }
    }

    // Primul pleaca SINGUR: el deschide dosarul lunii. Daca ar pleca patru
    // deodata pe o luna care nu exista inca, toate patru ar incerca sa o creeze
    // si s-ar lovi de cheia unica „un contract, o luna".
    if (deTrimis.length > 0) await trimiteUnul(deTrimis[0]);

    // Restul, cate patru odata. Treizeci de documente trimise unul dupa altul,
    // fiecare cu citirea lui, tineau minute intregi — destul cat sa para ca s-a
    // blocat. Patru deodata scurteaza asteptarea de vreo patru ori, si raman
    // destul de putine cat sa nu incarcam serverul cu tot teancul dintr-o data.
    const rest = deTrimis.slice(1);
    for (let i = 0; i < rest.length; i += 4) {
      await Promise.all(rest.slice(i, i + 4).map(trimiteUnul));
    }

    if (intrate > 0) {
      const strans = primiti - pastrati;
      setIzbanda(
        `${intrate} ${intrate === 1 ? "document a intrat" : "documente au intrat"} în dosarul pe ${numeLunaAleasa} ${an}.`
        + (strans > 256 * 1024 ? ` ${kb(primiti)} primite → ${kb(pastrati)} pe server.` : "")
        + (cost > 0 ? ` Citirea documentelor: $${cost.toFixed(3)}.` : ""),
      );
      // Dosarul se deschide singur, cu inventarul in el. Inainte il inchideam,
      // si omul ramanea fara raspuns la singura intrebare pe care o avea dupa
      // incarcare: „bun, si ce sunt documentele astea?".
      if (dosarId) { setDeschis(dosarId); setModSters(false); }
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
        onDrop={async e => {
          e.preventDefault();
          setPeste(false);
          adauga(await fisiereDinDrop(e.dataTransfer));
        }}
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
          {/* A doua intrare, pentru un folder intreg. `webkitdirectory` nu e in
              tipurile React, asa ca se pune pe elementul brut, prin ref. */}
          <input
            ref={el => {
              intrareFolder.current = el;
              if (el) { el.setAttribute("webkitdirectory", ""); el.setAttribute("directory", ""); }
            }}
            type="file" multiple hidden
            onChange={e => { adauga(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Buton fel="principal" marime="mare" disabled={inchisaLuna || trimite} incarca={desface}
              onClick={() => intrare.current?.click()}>
              {!desface && <Ic.sus className="h-4 w-4" />}
              {desface ? "Se desface arhiva…" : "Încarcă documente"}
            </Buton>
            <Buton fel="moale" marime="mare" disabled={inchisaLuna || trimite}
              onClick={() => intrareFolder.current?.click()}>
              <Ic.dosar className="h-4 w-4" />
              Un folder întreg
            </Buton>
          </div>
        </div>

        <div className="border-t border-line bg-surface-1 px-5 py-2.5">
          <p className="text-[11.5px] leading-relaxed text-faint">
            {inchisaLuna ? (
              <span className="text-warn">
                Dosarul pe {numeLunaAleasa} {an} are raport semnat și nu mai primește documente. Alege altă lună.
              </span>
            ) : (
              <>
                Documentele pleacă în clipa în care le alegi — nu mai e nimic de confirmat. Fiecare
                e deschis și citit, iar în listă apare cu numele lui („Factură Apa Nova”), nu cu cel
                al fișierului. {FORMATE_TEXT}. Ca să le iei pe toate: apasă „Un folder întreg”, sau
                trage folderul aici, sau — în fereastra de alegere — dă un clic pe primul fișier și
                abia apoi Ctrl+A.
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
                        {format && !format.inventariabil && " · nu poate fi deschis, rămâne pe numele fișierului"}
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
              {cazute.length > 0 && (
                <Buton fel="moale" incarca={trimite} onClick={() => trimiteTeanc(cazute)}>
                  <Ic.sus className="h-4 w-4" />
                  Încearcă din nou {cazute.length} {cazute.length === 1 ? "document" : "documente"}
                </Buton>
              )}
              {trimite && (
                <span className="tnum flex items-center gap-2 text-[12.5px] text-muted">
                  <Rotitor className="h-3.5 w-3.5" />
                  Se încarcă și se citesc — {progres.gata} din {progres.total}
                </span>
              )}
              {!trimite && cazute.length === 0 && intrateTot > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-ok">
                  <Ic.bifa className="h-3.5 w-3.5" />
                  Toate au intrat în dosar
                </span>
              )}
              {necitibile.length > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-faint">
                  <Ic.info className="h-3.5 w-3.5" />
                  {necitibile.length} {necitibile.length === 1 ? "document intră" : "documente intră"} în inventar,
                  dar nu în verificarea cifrelor
                </span>
              )}
              {nedeschise.length > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-warn">
                  <Ic.alerta className="h-3.5 w-3.5" />
                  {nedeschise.length} nu {nedeschise.length === 1 ? "poate fi deschis" : "pot fi deschise"} — rămân pe numele fișierului
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
