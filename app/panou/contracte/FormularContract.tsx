"use client";
import { useCallback, useState } from "react";
import { Buton, Camp, Card, CardCap, Rotitor } from "@/app/components/ui";
import { claseCamp } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import { useCuiAutofill, type AnafCompanyData } from "@/app/hooks/useCuiAutofill";

/**
 * Contract nou.
 *
 * Prima casuta e CUI-ul, si nu din intamplare: din el se completeaza singure
 * denumirea, adresa si telefonul, de la ANAF. Restul formularului se aranjeaza
 * in jurul lucrului care aduce cele mai multe date cu cel mai putin tastat.
 *
 * Formularul e impartit in trei, in ordinea in care omul are informatia in fata:
 * cine e beneficiarul, ce scrie in contract, si cui ii dam rapoartele. Un singur
 * teanc de saisprezece casute ar arata la fel de greu indiferent ca ai completat
 * doua sau paisprezece.
 *
 * Obligatorii sunt doar doua: denumirea si CUI-ul. Restul se poate completa mai
 * tarziu — un contract pe jumatate introdus e mai util decat unul neintrodus,
 * fiindca de el se pot lega deja documentele lunii.
 */

type Camp2 = Record<string, string>;

const GOL: Camp2 = {
  cui: "", denumire: "", regCom: "", adresa: "", localitate: "", telefon: "", email: "",
  reprezentant: "", numar: "", dataSemnarii: "", dataIncetarii: "", ziTermen: "15",
  persoanaNume: "", persoanaFunctie: "", persoanaEmail: "", persoanaTelefon: "",
  observatii: "",
};

/** Datele unui contract existent, aduse in forma casutelor de formular. */
export type ContractDeEditat = { id: string } & Partial<Record<keyof typeof GOL, string | number | null>>;

function dinContract(x: ContractDeEditat | undefined): Camp2 {
  if (!x) return GOL;
  const c: Camp2 = { ...GOL };
  for (const cheie of Object.keys(GOL)) {
    const v = x[cheie as keyof typeof GOL];
    if (v === null || v === undefined) { c[cheie] = ""; continue; }
    // Datele vin ca ISO din baza; casuta de data vrea doar „AAAA-LL-ZZ".
    c[cheie] = cheie.startsWith("data") ? String(v).slice(0, 10) : String(v);
  }
  return c;
}

export default function FormularContract({
  peSalvat, peRenunt, deEditat,
}: {
  peSalvat: () => void;
  peRenunt?: () => void;
  /** Cand e dat, formularul modifica in loc sa adauge. */
  deEditat?: ContractDeEditat;
}) {
  const editare = Boolean(deEditat);
  const [c, setC] = useState<Camp2>(() => dinContract(deEditat));
  const [salveaza, setSalveaza] = useState(false);
  const [eroare, setEroare] = useState("");
  const [duplicat, setDuplicat] = useState(false);

  const pune = (cheie: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setC(v => ({ ...v, [cheie]: e.target.value }));

  // Ce vine de la ANAF completeaza doar casutele GOALE. Daca omul a scris deja
  // ceva cu mana, nu i se sterge de sub degete — poate stie el mai bine decat
  // registrul, sau tocmai corecta.
  const laGasire = useCallback((d: AnafCompanyData) => {
    setC(v => ({
      ...v,
      denumire: v.denumire || d.denumire || "",
      adresa: v.adresa || d.strada || d.adresa || "",
      localitate: v.localitate || d.oras || "",
      telefon: v.telefon || d.telefon || "",
    }));
  }, []);

  const stareCui = useCuiAutafillSigur(c.cui, laGasire);
  const poateSalva = c.denumire.trim().length > 1 && c.cui.replace(/\D/g, "").length >= 2;

  async function salveazaContractul(confirmDuplicat = false) {
    if (!poateSalva || salveaza) return;
    setSalveaza(true);
    setEroare("");
    try {
      const r = await fetch(
        editare ? `/api/panou/contracte/${deEditat!.id}` : "/api/panou/contracte",
        {
          method: editare ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...c, ziTermen: Number(c.ziTermen), confirmDuplicat }),
        },
      );
      const d = await r.json();
      if (r.status === 409) { setDuplicat(true); setEroare(d.error); return; }
      if (!r.ok) throw new Error(d.error || "Contractul nu a putut fi salvat.");
      if (!editare) setC(GOL);
      peSalvat();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Contractul nu a putut fi salvat.");
    } finally {
      setSalveaza(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardCap
        titlu={editare ? "Editează contractul" : "Contract nou"}
        sub={editare
          ? "Modifică ce s-a schimbat; restul rămâne cum a fost."
          : "Introdu CUI-ul și restul datelor firmei vin singure de la ANAF."}
        actiune={peRenunt && <Buton fel="fantoma" marime="mic" onClick={peRenunt}>Renunță</Buton>}
      />

      <div className="space-y-6 px-5 py-5">
        {/* ------------------------------------------------ beneficiarul */}
        <section>
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
            Beneficiarul
          </p>

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Camp eticheta="CUI" obligatoriu ajutor={mesajCui(stareCui)}>
              <div className="relative">
                <input
                  value={c.cui} onChange={pune("cui")} inputMode="numeric"
                  placeholder="ex. 45123789" autoFocus={!editare}
                  className={`${claseCamp} pr-9`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {stareCui === "loading" && <Rotitor className="h-3.5 w-3.5 text-brand-soft" />}
                  {stareCui === "found" && <Ic.bifa className="h-4 w-4 text-ok" />}
                  {stareCui === "notfound" && <Ic.info className="h-4 w-4 text-faint" />}
                  {stareCui === "error" && <Ic.alerta className="h-4 w-4 text-warn" />}
                </span>
              </div>
            </Camp>

            <Camp eticheta="Denumire" obligatoriu>
              <input value={c.denumire} onChange={pune("denumire")} className={claseCamp}
                placeholder="ex. Asociația de Proprietari Bloc 12" />
            </Camp>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Camp eticheta="Adresă">
              <input value={c.adresa} onChange={pune("adresa")} className={claseCamp}
                placeholder="strada, număr, bloc, scară" />
            </Camp>
            <Camp eticheta="Localitate">
              <input value={c.localitate} onChange={pune("localitate")} className={claseCamp} />
            </Camp>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Camp eticheta="Telefon">
              <input value={c.telefon} onChange={pune("telefon")} className={claseCamp} inputMode="tel" />
            </Camp>
            <Camp eticheta="Email">
              <input value={c.email} onChange={pune("email")} className={claseCamp} inputMode="email"
                placeholder="adresa la care trimitem corespondența" />
            </Camp>
            <Camp eticheta="Reprezentant legal" ajutor="Cine semnează din partea asociației.">
              <input value={c.reprezentant} onChange={pune("reprezentant")} className={claseCamp}
                placeholder="președinte sau administrator" />
            </Camp>
          </div>
        </section>

        {/* --------------------------------------------------- contractul */}
        <section className="border-t border-line pt-5">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
            Contractul
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Camp eticheta="Număr">
              <input value={c.numar} onChange={pune("numar")} className={claseCamp} placeholder="ex. 128/2026" />
            </Camp>
            <Camp eticheta="Data semnării">
              <input type="date" value={c.dataSemnarii} onChange={pune("dataSemnarii")} className={claseCamp} />
            </Camp>
            <Camp eticheta="Data încetării" ajutor="Gol = durată nedeterminată.">
              <input type="date" value={c.dataIncetarii} onChange={pune("dataIncetarii")} className={claseCamp} />
            </Camp>
            <Camp eticheta="Termen lunar" ajutor="Ziua până la care trimit documentele.">
              <select value={c.ziTermen} onChange={pune("ziTermen")} className={claseCamp}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(z => (
                  <option key={z} value={String(z)}>ziua {z}</option>
                ))}
              </select>
            </Camp>
          </div>
        </section>

        {/* ------------------------------------------- persoana desemnată */}
        <section className="border-t border-line pt-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
            Persoana desemnată prin contract
          </p>
          <p className="mb-3 mt-1 max-w-2xl text-[12px] leading-relaxed text-faint">
            Singura care va putea descărca rapoartele semnate din contul ei. Se poate completa
            și mai târziu — până atunci, rapoartele rămân la noi.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Camp eticheta="Nume">
              <input value={c.persoanaNume} onChange={pune("persoanaNume")} className={claseCamp} />
            </Camp>
            <Camp eticheta="Funcție">
              <input value={c.persoanaFunctie} onChange={pune("persoanaFunctie")} className={claseCamp}
                placeholder="ex. președinte, administrator" />
            </Camp>
            <Camp eticheta="Email">
              <input value={c.persoanaEmail} onChange={pune("persoanaEmail")} className={claseCamp} inputMode="email" />
            </Camp>
            <Camp eticheta="Telefon">
              <input value={c.persoanaTelefon} onChange={pune("persoanaTelefon")} className={claseCamp} inputMode="tel" />
            </Camp>
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <Camp eticheta="Observații">
            <textarea value={c.observatii} onChange={pune("observatii")} rows={2}
              className={`${claseCamp} resize-y`}
              placeholder="Ce e bine de știut despre acest contract." />
          </Camp>
        </section>

        {eroare && (
          <div className={`rounded-[var(--radius-field)] border px-4 py-3 ${
            duplicat ? "border-warn/30 bg-warn-dim/50" : "border-bad/30 bg-bad-dim/50"
          }`}>
            <p className={`flex items-start gap-2 text-[13px] ${duplicat ? "text-warn" : "text-bad"}`}>
              <Ic.alerta className="mt-0.5 h-4 w-4 shrink-0" />
              {eroare}
            </p>
            {duplicat && (
              <Buton fel="moale" marime="mic" className="mt-3" incarca={salveaza}
                onClick={() => salveazaContractul(true)}>
                Adaugă oricum
              </Buton>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-1 px-5 py-3.5">
        <Buton fel="principal" incarca={salveaza} disabled={!poateSalva}
          onClick={() => salveazaContractul(false)}>
          {editare ? <Ic.bifa className="h-4 w-4" /> : <Ic.plus className="h-4 w-4" />}
          {editare ? "Salvează modificările" : "Salvează contractul"}
        </Buton>
        {!poateSalva && (
          <span className="text-[12.5px] text-faint">Denumirea și CUI-ul sunt obligatorii.</span>
        )}
      </div>
    </Card>
  );
}

function mesajCui(stare: string): string | undefined {
  if (stare === "loading") return "Se caută la ANAF…";
  if (stare === "found") return "Găsit — datele de mai jos s-au completat singure.";
  if (stare === "notfound") return "Nu apare la ANAF. Completează manual.";
  if (stare === "error") return "ANAF nu răspunde acum. Completează manual.";
  return undefined;
}

/**
 * Acelasi carlig ca inainte, doar ca nu porneste cautarea pe un camp gol.
 * `useCuiAutofill` se ocupa de asteptare si de anulare; noi doar ne asiguram ca
 * nu-l chemam degeaba la fiecare tasta stearsa.
 */
function useCuiAutafillSigur(cui: string, laGasire: (d: AnafCompanyData) => void) {
  return useCuiAutofill(cui.replace(/\D/g, ""), laGasire);
}
