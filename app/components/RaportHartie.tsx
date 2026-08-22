import { Constatare, ExtrasDosar, SEVERITATI, Severitate } from "@/lib/cenzorat/tipuri";
import { VERDICTE, Verdict } from "@/lib/cenzorat/scor";

/**
 * Raportul de cenzor, asa cum se citeste si cum se tipareste.
 *
 * O singura sursa pentru amandoua. Inainte existau trei generatoare de raport
 * care nu semanau intre ele: unul in panoul clientului (construia HTML dintr-un
 * markdown convertit de mana), unul in ruta de admin (700 de linii de HTML cu
 * stiluri inline) si un al treilea, minimal, in butonul de descarcare al
 * cenzorului. Trei formate diferite pentru acelasi document.
 *
 * Raportul se afiseaza pe HARTIE ALBA chiar si in aplicatia intunecata. Nu e o
 * toana: documentul asta se semneaza, se tipareste in doua exemplare si se pune
 * la dosarul asociatiei. Trebuie sa arate ca hartia care va fi.
 */

export type DateRaport = {
  versiune?: number;
  asociatie: { denumire: string | null; cui: string | null; adresa: string | null };
  perioada: { luna: string | null; an: number | null };
  extras: ExtrasDosar | null;
  incredere: { procent: number; gasite: number; total: number };
  scor: { valoare: number; verdict: Verdict; defalcare: { severitate: Severitate; eticheta: string; numar: number; puncte: number }[] };
  constatari: (Constatare & { stare?: string; notaCenzor?: string | null })[];
  concluzie: string | null;
  semnatar: string | null;
  semnatLa: string | null;
};

const CULOARE_SEV: Record<Severitate, string> = {
  critica: "#dc2626", ridicata: "#ea580c", medie: "#d97706", scazuta: "#0284c7", info: "#64748b",
};
const CULOARE_VERDICT: Record<Verdict, string> = {
  conform: "#059669", observatii: "#0284c7", neconform: "#d97706", grav: "#dc2626",
};

const lei = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " lei";

function Sectiune({ numar, titlu, children }: { numar: string; titlu: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid first:mt-0">
      <h2 className="mb-3 flex items-baseline gap-2.5 border-b border-[var(--color-paper-line)] pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-paper-muted)]">{numar}</span>
        <span className="text-[15px] font-semibold text-[var(--color-paper-ink)]">{titlu}</span>
      </h2>
      {children}
    </section>
  );
}

function Rand({ eticheta, valoare }: { eticheta: string; valoare: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dotted border-[var(--color-paper-line)] py-1.5 last:border-0">
      <span className="text-[12.5px] text-[var(--color-paper-muted)]">{eticheta}</span>
      <span className="tnum text-right text-[13px] font-medium text-[var(--color-paper-ink)]">{valoare}</span>
    </div>
  );
}

export default function RaportHartie({ date, titlu }: { date: DateRaport; titlu: string }) {
  const e = date.extras;
  const verdict = VERDICTE[date.scor.verdict] ?? VERDICTE.observatii;
  const retinute = date.constatari.filter(c => c.stare !== "respinsa");
  const respinse = date.constatari.filter(c => c.stare === "respinsa");
  const recomandari = retinute.filter(c => c.recomandare).map(c => c.recomandare as string);

  return (
    <article className="mx-auto max-w-[820px] bg-[var(--color-paper)] px-10 py-9 text-[var(--color-paper-ink)] shadow-[0_1px_3px_rgba(0,0,0,.18),0_18px_60px_-20px_rgba(0,0,0,.5)] print:max-w-none print:px-0 print:py-0 print:shadow-none">

      {/* ------------------------------------------------------------ antet */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-[var(--color-paper-ink)] pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-paper-muted)]">
            Raport de cenzor
          </p>
          <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
            {date.asociatie.denumire ?? "Asociație de proprietari"}
          </h1>
          <p className="mt-1 text-[12.5px] text-[var(--color-paper-muted)]">
            {[date.asociatie.cui && `CUI ${date.asociatie.cui}`, date.asociatie.adresa].filter(Boolean).join(" · ") || titlu}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="inline-block rounded-md border px-3 py-2"
            style={{ borderColor: CULOARE_VERDICT[date.scor.verdict], color: CULOARE_VERDICT[date.scor.verdict] }}
          >
            <p className="tnum text-[26px] font-semibold leading-none">{date.scor.valoare}%</p>
            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider">{verdict.eticheta}</p>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-paper-muted)]">
            Perioada: <strong className="font-semibold text-[var(--color-paper-ink)]">{date.perioada.luna} {date.perioada.an}</strong>
          </p>
        </div>
      </header>

      {/* ------------------------------------------------- I. identificare */}
      <Sectiune numar="I" titlu="Date de identificare">
        <div className="grid gap-x-10 sm:grid-cols-2">
          <div>
            <Rand eticheta="Asociația" valoare={date.asociatie.denumire ?? "—"} />
            <Rand eticheta="Cod fiscal" valoare={e?.identificare.cui ?? date.asociatie.cui ?? "—"} />
            <Rand eticheta="Adresă" valoare={e?.identificare.adresa ?? date.asociatie.adresa ?? "—"} />
            <Rand eticheta="Bancă / IBAN" valoare={[e?.identificare.banca, e?.identificare.iban].filter(Boolean).join(" · ") || "—"} />
          </div>
          <div>
            <Rand eticheta="Președinte" valoare={e?.identificare.presedinte ?? "—"} />
            <Rand eticheta="Administrator" valoare={e?.identificare.administrator ?? "—"} />
            <Rand eticheta="Data afișării listei" valoare={e?.perioada.dataAfisarii ?? "—"} />
            <Rand eticheta="Data scadentă" valoare={e?.perioada.dataScadenta ?? "—"} />
          </div>
        </div>
      </Sectiune>

      {/* --------------------------------------------- II. situația lunii */}
      {e && (
        <Sectiune numar="II" titlu="Situația financiară a lunii">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <div>
              <p className="mb-1 mt-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-paper-muted)]">Casierie</p>
              <Rand eticheta="Sold inițial" valoare={lei(e.casa.soldInitial)} />
              <Rand eticheta="Încasări" valoare={lei(e.casa.totalIncasari)} />
              <Rand eticheta="Plăți" valoare={lei(e.casa.totalPlati)} />
              <Rand eticheta="Sold final" valoare={lei(e.casa.soldFinal)} />

              <p className="mb-1 mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-paper-muted)]">Fonduri</p>
              <Rand eticheta="Fond de rulment" valoare={lei(e.fonduri.rulment)} />
              <Rand eticheta="Fond de reparații" valoare={lei(e.fonduri.reparatii)} />
              {e.fonduri.penalitati !== null && <Rand eticheta="Fond penalități" valoare={lei(e.fonduri.penalitati)} />}
              {e.fonduri.altele.map(f => <Rand key={f.denumire} eticheta={f.denumire} valoare={lei(f.sold)} />)}
            </div>
            <div>
              <p className="mb-1 mt-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-paper-muted)]">Bancă</p>
              <Rand eticheta="Sold inițial" valoare={lei(e.banca.soldInitial)} />
              <Rand eticheta="Încasări" valoare={lei(e.banca.totalIncasari)} />
              <Rand eticheta="Plăți" valoare={lei(e.banca.totalPlati)} />
              <Rand eticheta="Sold final" valoare={lei(e.banca.soldFinal)} />

              <p className="mb-1 mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-paper-muted)]">Listă de plată</p>
              <Rand eticheta="Total cheltuieli repartizate" valoare={lei(e.lista.totalCheltuieli)} />
              <Rand eticheta="Restanțe" valoare={lei(e.restantieri.total ?? e.lista.totalRestante)} />
              <Rand eticheta="Facturi neachitate" valoare={lei(e.furnizori.totalNeachitat)} />
              <Rand eticheta="Apartamente" valoare={e.lista.numarApartamente ?? "—"} />
            </div>
          </div>

          {e.restantieri.apartamente.length > 0 && (
            <div className="mt-5 break-inside-avoid">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-paper-muted)]">
                Apartamente cu restanțe ({e.restantieri.apartamente.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {e.restantieri.apartamente.map(a => (
                  <span key={a.apartament} className="rounded border border-[var(--color-paper-line)] bg-[var(--color-paper-2)] px-2 py-1 text-[11.5px]">
                    <span className="font-medium">ap. {a.apartament}</span>
                    <span className="tnum ml-1.5 text-[var(--color-paper-muted)]">{lei(a.suma)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Sectiune>
      )}

      {/* --------------------------------------------- III. constatări */}
      <Sectiune numar="III" titlu={`Constatări (${retinute.length})`}>
        {retinute.length === 0 ? (
          <p className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-3 text-[13px] text-[#065f46]">
            Nu au fost reținute abateri pentru perioada verificată.
          </p>
        ) : (
          <ol className="space-y-3.5">
            {retinute.map((c, i) => (
              <li key={c.cod + i} className="break-inside-avoid rounded-md border-l-[3px] bg-[var(--color-paper-2)] py-3 pl-4 pr-4"
                style={{ borderLeftColor: CULOARE_SEV[c.severitate] }}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-semibold leading-snug">{i + 1}. {c.titlu}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ background: CULOARE_SEV[c.severitate] }}>
                    {SEVERITATI[c.severitate].eticheta}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#374151]">{c.detaliu}</p>

                {c.probe.length > 0 && (
                  <table className="mt-2.5 w-full border-collapse text-[11.5px]">
                    <tbody>
                      {c.probe.map((p, j) => (
                        <tr key={j} className="border-b border-[var(--color-paper-line)] last:border-0">
                          <td className="py-1 pr-3 text-[var(--color-paper-muted)]">{p.eticheta}</td>
                          <td className="tnum py-1 text-right font-medium">{p.valoare}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {c.temei && (
                  <p className="mt-2 border-l-2 border-[#93c5fd] bg-[#eff6ff] py-1.5 pl-2.5 text-[11.5px] italic text-[#1d4ed8]">
                    {c.temei}
                  </p>
                )}
                {c.notaCenzor && (
                  <p className="mt-2 text-[12px] italic text-[#374151]">
                    <span className="font-semibold not-italic">Nota cenzorului: </span>{c.notaCenzor}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        {respinse.length > 0 && (
          <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--color-paper-muted)]">
            Verificările automate au mai semnalat {respinse.length}{" "}
            {respinse.length === 1 ? "aspect care, la analiză, nu a fost reținut" : "aspecte care, la analiză, nu au fost reținute"} de cenzor.
          </p>
        )}
      </Sectiune>

      {/* --------------------------------------------- IV. recomandări */}
      {recomandari.length > 0 && (
        <Sectiune numar="IV" titlu="Recomandări">
          <ol className="space-y-2">
            {recomandari.map((r, i) => (
              <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed">
                <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-paper-ink)] text-[10.5px] font-semibold text-white">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </Sectiune>
      )}

      {/* --------------------------------------------- V. concluzie */}
      <Sectiune numar="V" titlu="Concluzie">
        <div className="rounded-md border border-[var(--color-paper-line)] bg-[var(--color-paper-2)] p-4">
          {date.concluzie ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{date.concluzie}</p>
          ) : (
            <p className="text-[13px] leading-relaxed">{verdict.descriere}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[var(--color-paper-line)] pt-3 text-[11.5px] text-[var(--color-paper-muted)]">
            <span>
              Scor de corectitudine:{" "}
              <strong className="tnum font-semibold" style={{ color: CULOARE_VERDICT[date.scor.verdict] }}>
                {date.scor.valoare}% — {verdict.eticheta}
              </strong>
            </span>
            <span>
              Acoperirea datelor: <strong className="tnum font-semibold text-[var(--color-paper-ink)]">{date.incredere.procent}%</strong>
              {date.incredere.total > 0 && ` (${date.incredere.gasite} din ${date.incredere.total} indicatori citiți din documente)`}
            </span>
          </div>
        </div>
      </Sectiune>

      {/* --------------------------------------------- VI. semnături */}
      <Sectiune numar="VI" titlu="Semnături">
        <div className="grid gap-8 pt-4 sm:grid-cols-3">
          {[
            { rol: "Președinte", nume: e?.identificare.presedinte ?? "" },
            { rol: "Administrator", nume: e?.identificare.administrator ?? "" },
            { rol: "Cenzor", nume: date.semnatar ?? "" },
          ].map(s => (
            <div key={s.rol} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-paper-muted)]">{s.rol}</p>
              <p className="mt-1 min-h-[18px] text-[12.5px] font-medium">{s.nume || " "}</p>
              <div className="mt-11 border-t border-[var(--color-paper-ink)] pt-1.5">
                <p className="text-[10.5px] text-[var(--color-paper-muted)]">Semnătură și ștampilă</p>
              </div>
            </div>
          ))}
        </div>
      </Sectiune>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-paper-line)] pt-3 text-[10.5px] text-[var(--color-paper-muted)]">
        <span>
          Întocmit în conformitate cu Legea nr. 196/2018. Se încheie în două exemplare, câte unul
          pentru asociație și pentru cenzor.
        </span>
        <span>
          {date.semnatLa && `Semnat ${new Date(date.semnatLa).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })} · `}
          VoSmart
        </span>
      </footer>
    </article>
  );
}
