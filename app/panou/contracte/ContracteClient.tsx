"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Buton, Card, CardCap, Eticheta, Gol, Paginare, Schelet } from "@/app/components/ui";
import { dataRo, Ton } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";
import FormularContract from "./FormularContract";

/**
 * Registrul de contracte.
 *
 * Cand nu exista niciunul, formularul e deschis din start: la primul contract,
 * un ecran gol cu un buton „Adaugă" e un pas in plus fara rost.
 */

type Contract = {
  id: string; numar: string | null; denumire: string; cui: string;
  localitate: string | null; adresa: string | null; telefon: string | null; email: string | null;
  reprezentant: string | null; persoanaNume: string | null; persoanaEmail: string | null;
  ziTermen: number; status: string;
  dataSemnarii: string | null; dataIncetarii: string | null;
  dosare: number;
};

const STATUS: Record<string, { text: string; ton: Ton }> = {
  activ: { text: "Activ", ton: "ok" },
  suspendat: { text: "Suspendat", ton: "warn" },
  incheiat: { text: "Încheiat", ton: "neutru" },
};

export default function ContracteClient({ initialCount }: { initialCount: number }) {
  const [contracte, setContracte] = useState<Contract[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [pagina, setPagina] = useState(1);
  const [pagini, setPagini] = useState(1);
  const [cauta, setCauta] = useState("");
  const [incarca, setIncarca] = useState(true);
  const [formularDeschis, setFormularDeschis] = useState(initialCount === 0);
  const [reincarca, setReincarca] = useState(0);

  useEffect(() => {
    let activ = true;
    // Cautarea se lasa asteptata: altfel pleaca o cerere la fiecare litera.
    const asteapta = setTimeout(() => {
      fetch(`/api/panou/contracte?pagina=${pagina}&cauta=${encodeURIComponent(cauta)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (!activ || !d) return;
          setContracte(d.contracte);
          setTotal(d.total);
          setPagini(d.pagini);
          setIncarca(false);
        })
        .catch(() => { if (activ) setIncarca(false); });
    }, cauta ? 350 : 0);
    return () => { activ = false; clearTimeout(asteapta); };
  }, [pagina, cauta, reincarca]);

  const gol = !incarca && total === 0 && !cauta;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Contracte</h1>
          <p className="mt-1 text-[13.5px] text-faint">
            Asociațiile și firmele pentru care VoSmart face cenzorat.
          </p>
        </div>
        {!formularDeschis && (
          <Buton fel="principal" onClick={() => setFormularDeschis(true)}>
            <Ic.plus className="h-4 w-4" /> Adaugă contract
          </Buton>
        )}
      </header>

      {formularDeschis && (
        <div className="mb-5">
          <FormularContract
            peSalvat={() => {
              setFormularDeschis(false);
              setPagina(1);
              setReincarca(v => v + 1);
            }}
            peRenunt={gol ? undefined : () => setFormularDeschis(false)}
          />
        </div>
      )}

      {gol && !formularDeschis ? null : incarca ? (
        <Card className="space-y-3 px-5 py-5">
          <Schelet className="h-12" /><Schelet className="h-12" /><Schelet className="h-12" />
        </Card>
      ) : total === 0 && !cauta ? (
        <Card>
          <Gol
            pictograma={<Ic.contract className="h-5 w-5" />}
            titlu="Niciun contract încă"
            text="Completează formularul de mai sus. De contract se leagă apoi documentele fiecărei luni, verificarea AI și raportul semnat."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardCap
            titlu={`${total} ${total === 1 ? "contract" : "contracte"}`}
            actiune={
              <div className="relative">
                <Ic.cauta className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <input
                  value={cauta}
                  onChange={e => { setCauta(e.target.value); setPagina(1); }}
                  placeholder="Caută după denumire, CUI sau număr"
                  className="h-8 w-64 rounded-lg border border-line-strong bg-surface-1 pl-8 pr-3 text-[12.5px] text-ink placeholder:text-faint outline-none focus:border-brand/60"
                />
              </div>
            }
          />

          {contracte.length === 0 ? (
            <Gol titlu="Nimic găsit" text={`Niciun contract nu se potrivește cu „${cauta}".`} />
          ) : (
            <ul className="divide-y divide-line">
              {contracte.map(c => {
                const st = STATUS[c.status] ?? { text: c.status, ton: "neutru" as Ton };
                return (
                  <li key={c.id} className="rise flex items-center gap-4 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface-3 text-faint">
                      <Ic.contract className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-medium text-ink">{c.denumire}</p>
                        {c.status !== "activ" && <Eticheta ton={st.ton}>{st.text}</Eticheta>}
                        {!c.persoanaNume && (
                          <Eticheta ton="warn" className="gap-1">
                            <Ic.info className="h-3 w-3" /> fără persoană desemnată
                          </Eticheta>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-faint">
                        {[
                          `CUI ${c.cui}`,
                          c.numar && `contract ${c.numar}`,
                          c.localitate,
                          c.dataSemnarii && `semnat ${dataRo(c.dataSemnarii)}`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="tnum text-[13px] font-medium text-ink">{c.dosare}</p>
                      <p className="text-[11px] text-faint">{c.dosare === 1 ? "dosar" : "dosare"}</p>
                    </div>

                    <div className="hidden shrink-0 text-right md:block">
                      <p className="tnum text-[13px] text-muted">ziua {c.ziTermen}</p>
                      <p className="text-[11px] text-faint">termen lunar</p>
                    </div>

                    <Link href={`/panou/contracte/${c.id}`}
                      className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                      aria-label={`Deschide ${c.denumire}`}>
                      <Ic.dreapta className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Paginare pagina={pagina} pagini={pagini} total={total} numeElement="contracte" peSchimbare={setPagina} />
        </Card>
      )}
    </div>
  );
}
