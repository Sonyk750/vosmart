"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";
import {
  Buton, Card, CardCap, dataRo, Eticheta, Gol, Paginare, Schelet, Statistica, Ton } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";
import DosarNou from "./DosarNou";
import ListaDosare from "./ListaDosare";
import FluxDosar from "./FluxDosar";

/**
 * Panoul firmei / asociatiei.
 *
 * Ce s-a schimbat fata de varianta veche, pe scurt:
 *  - incarcarea si lista de dosare au iesit din fisierul asta in componente
 *    proprii (`DosarNou`, `ListaDosare`), fiindca aveau peste 700 de linii aici
 *    si nu se mai putea citi nimic;
 *  - listele vin pe pagini, nu toate deodata la fiecare 8 secunde;
 *  - rapoartele nu se mai deschid intr-un `<pre>` cu text brut, ci ca document;
 *  - nuantele vin din tokeni, nu din valori scrise de mana la fiecare card.
 *
 * Logica de abonament a ramas neatinsa.
 */

interface Corporate {
  id: string; companyName: string; package: string; maxAssoc: number;
  status: string; logoUrl: string | null; cui: string | null;
  subscriptionStatus: string | null; currentPeriodEnd: string | null;
  associations: { id: string; name: string; filesUploadedCount: number; maxDocuments: number }[];
}
interface User { id: string; name: string | null; email: string; role: string }

type Fila = "dosare" | "rapoarte" | "abonament";

const ALL_PACKAGES: CorporatePackage[] = ["trial", "starter", "business", "professional", "enterprise"];

type Raport = {
  id: string; titlu: string; luna: string | null; an: number | null;
  status: string; creatLa: string; semnatDe: string | null; semnatLa: string | null;
};

export default function CorporateDashboard({
  corporate, isAdmin = false,
}: { user: User; corporate: Corporate; isAdmin?: boolean }) {
  const router = useRouter();
  const [fila, setFila] = useState<Fila>("dosare");
  const [previewPackage, setPreviewPackage] = useState<CorporatePackage>(corporate.package as CorporatePackage);

  const cheiePachet: CorporatePackage = isAdmin ? previewPackage : (corporate.package as CorporatePackage);
  const pachet = CORPORATE_PACKAGES[cheiePachet];

  const asociatie = corporate.associations?.[0];
  const folosite = asociatie?.filesUploadedCount ?? 0;
  const maxim = asociatie?.maxDocuments ?? corporate.maxAssoc;
  const laLimita = maxim > 0 && folosite >= maxim;

  // Un dosar tocmai trimis isi arata fluxul in capul paginii, ca omul sa vada ce
  // se intampla fara sa il caute in lista.
  const [dosarNou, setDosarNou] = useState<string | null>(null);
  const [reincarcaLista, setReincarcaLista] = useState(0);

  async function iesire() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/corporate";
  }

  return (
    <main className="min-h-screen bg-app text-ink">
      {/* ------------------------------------------------------------ cap */}
      <header className="sticky top-0 z-40 border-b border-line bg-app/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {corporate.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={corporate.logoUrl} alt={corporate.companyName} className="h-8 w-auto object-contain" />
            ) : (
              <Image src="/logo-vosmart.png" alt="VoSmart" width={72} height={32}
                className="h-auto" style={{ mixBlendMode: "screen", width: "64px" }} />
            )}
            <span aria-hidden className="h-5 w-px bg-line-strong" />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium leading-tight">{corporate.companyName}</p>
              <p className="text-[11.5px] leading-tight text-faint">
                {pachet ? `${pachet.name}${pachet.priceRon > 0 ? ` · ${pachet.priceRon} lei/lună` : ""}` : corporate.package}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link href="/" className="hidden rounded-[var(--radius-field)] px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-surface-3 hover:text-ink sm:inline-block">
              Site
            </Link>
            <Buton fel="fantoma" marime="mic" onClick={iesire}>
              <Ic.iesire className="h-3.5 w-3.5" /> Ieșire
            </Buton>
          </div>
        </div>
      </header>

      {isAdmin && (
        <div className="border-b border-warn/20 bg-warn-dim/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
            <span className="text-[11px] font-medium uppercase tracking-wider text-warn">Mod test — pachet simulat</span>
            {ALL_PACKAGES.map(p => (
              <button key={p} onClick={() => setPreviewPackage(p)}
                className={`rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors ${
                  previewPackage === p ? "bg-warn text-app" : "text-warn/80 hover:bg-warn/15"
                }`}>
                {CORPORATE_PACKAGES[p].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ------------------------------------------------- sumar scurt */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Statistica
            pictograma={<Ic.dosar className="h-4 w-4" />}
            valoare={<>{folosite}<span className="text-[15px] font-normal text-faint">/{maxim >= 9999 ? "∞" : maxim}</span></>}
            eticheta="Dosare folosite"
            ton={laLimita ? "bad" : folosite >= maxim - 1 ? "warn" : "brand"}
          />
          <Statistica pictograma={<Ic.raport className="h-4 w-4" />} valoare={<RapoarteSemnate />} eticheta="Rapoarte semnate" ton="ok" />
          <Statistica pictograma={<Ic.scut className="h-4 w-4" />} valoare={pachet?.docsPerDosar ?? 30} eticheta="Documente / dosar" />
          <Statistica
            pictograma={<Ic.cheie className="h-4 w-4" />}
            valoare={corporate.subscriptionStatus === "active" ? "Activ" : corporate.subscriptionStatus === "trialing" ? "Probă" : "—"}
            eticheta="Abonament"
            ton={corporate.subscriptionStatus === "active" ? "ok" : "neutru"}
          />
        </div>

        {/* ------------------------------------------------------- file */}
        <nav className="mb-5 flex gap-0.5 border-b border-line">
          {([
            { cheie: "dosare" as const, text: "Dosare" },
            { cheie: "rapoarte" as const, text: "Rapoarte" },
            { cheie: "abonament" as const, text: "Abonament" },
          ]).map(f => (
            <button
              key={f.cheie}
              onClick={() => setFila(f.cheie)}
              aria-current={fila === f.cheie ? "page" : undefined}
              className={`relative -mb-px px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                fila === f.cheie ? "text-ink" : "text-faint hover:text-muted"
              }`}
            >
              {f.text}
              {fila === f.cheie && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </nav>

        {fila === "dosare" && (
          <div className="space-y-5">
            {dosarNou && (
              <FluxDosar
                dosarId={dosarNou}
                peFinal={() => { setReincarcaLista(v => v + 1); setDosarNou(null); }}
              />
            )}

            <DosarNou
              numeImplicit={asociatie?.name}
              doarDeBaza={cheiePachet === "trial"}
              blocat={laLimita}
              motivBlocare={`Pachetul ${pachet?.name ?? corporate.package} include ${maxim} ${maxim === 1 ? "dosar" : "dosare"}. Ștergeți un dosar vechi sau treceți la un plan mai mare — dosarele suplimentare costă 40 lei bucata.`}
              peTrimis={id => { setDosarNou(id); setReincarcaLista(v => v + 1); router.refresh(); }}
            />

            <ListaDosare reincarca={reincarcaLista} />
          </div>
        )}

        {fila === "rapoarte" && <FilaRapoarte />}

        {fila === "abonament" && (
          <FilaAbonament corporate={corporate} pachet={pachet} cheiePachet={cheiePachet} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- rapoarte */

function RapoarteSemnate() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/dashboard/reports?pePagina=1")
      .then(r => (r.ok ? r.json() : null))
      .then(d => setN(d?.total ?? 0))
      .catch(() => setN(0));
  }, []);
  return <>{n === null ? "—" : n}</>;
}

function FilaRapoarte() {
  const [rapoarte, setRapoarte] = useState<Raport[]>([]);
  const [pagina, setPagina] = useState(1);
  const [pagini, setPagini] = useState(1);
  const [total, setTotal] = useState(0);
  const [incarca, setIncarca] = useState(true);

  useEffect(() => {
    let activ = true;
    fetch(`/api/dashboard/reports?pagina=${pagina}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!activ || !d) return;
        setRapoarte(d.rapoarte);
        setPagini(d.pagini);
        setTotal(d.total);
        setIncarca(false);
      })
      .catch(() => { if (activ) setIncarca(false); });
    return () => { activ = false; };
  }, [pagina]);

  if (incarca && rapoarte.length === 0) {
    return <Card className="space-y-3 px-5 py-5"><Schelet className="h-12" /><Schelet className="h-12" /></Card>;
  }

  if (total === 0) {
    return (
      <Card>
        <Gol
          pictograma={<Ic.raport className="h-5 w-5" />}
          titlu="Niciun raport semnat încă"
          text="Rapoartele apar aici după ce cenzorul revizuiește dosarul și îl semnează. Până atunci, starea verificării se vede la fila Dosare."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardCap titlu="Rapoarte de cenzor" sub="Documente semnate, gata de pus la dosarul asociației." />
      <ul className="divide-y divide-line">
        {rapoarte.map(r => (
          <li key={r.id} className="rise flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ok/30 bg-ok-dim text-ok">
              <Ic.semnatura className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-ink">{r.titlu}</p>
              <p className="text-[12px] text-faint">
                {r.luna} {r.an}
                {r.semnatDe && ` · semnat de ${r.semnatDe}`}
                {r.semnatLa && ` · ${dataRo(r.semnatLa)}`}
              </p>
            </div>
            <a
              href={`/raport/${r.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-4"
            >
              Deschide <Ic.dreapta className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
      <Paginare pagina={pagina} pagini={pagini} total={total} numeElement="rapoarte" peSchimbare={setPagina} />
    </Card>
  );
}

/* ------------------------------------------------------------ abonament */

function FilaAbonament({
  corporate, pachet, cheiePachet,
}: {
  corporate: Corporate;
  pachet: { name: string; priceRon: number; maxAssoc: number; docsPerDosar: number } | undefined;
  cheiePachet: CorporatePackage;
}) {
  const router = useRouter();
  const [porneste, setPorneste] = useState(false);
  const [secret, setSecret] = useState("");
  const [mesaj, setMesaj] = useState("");

  const stare = corporate.subscriptionStatus;
  const activ = stare === "active" || stare === "trialing";

  const TON_STARE: Record<string, [Ton, string]> = {
    active: ["ok", "Activ"],
    trialing: ["info", "Perioadă de probă"],
    incomplete: ["warn", "Incomplet"],
    past_due: ["bad", "Plată restantă"],
    canceled: ["neutru", "Anulat"],
    unpaid: ["bad", "Neplătit"],
  };
  const [tonStare, textStare] = (stare && TON_STARE[stare]) || (["neutru", "Fără abonament"] as [Ton, string]);

  async function incepe() {
    setPorneste(true);
    setMesaj("");
    try {
      const r = await fetch("/api/billing/subscribe", { method: "POST" });
      const d = await r.json();
      if (r.ok) setSecret(d.clientSecret);
      else setMesaj(d.error || "Plata nu a putut fi inițiată.");
    } catch {
      setMesaj("Eroare de conexiune.");
    } finally {
      setPorneste(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardCap
          titlu={pachet?.name ?? corporate.package}
          sub={pachet && pachet.priceRon > 0 ? `${pachet.priceRon} lei/lună` : cheiePachet === "enterprise" ? "Preț personalizat" : "Gratuit"}
          actiune={<Eticheta ton={tonStare}>{textStare}</Eticheta>}
        />
        <div className="px-5 py-4">
          {corporate.currentPeriodEnd && (
            <p className="mb-3 text-[12.5px] text-faint">Valabil până la {dataRo(corporate.currentPeriodEnd)}</p>
          )}
          {!activ && (
            secret ? (
              <CardPaymentForm
                clientSecret={secret}
                onSuccess={() => {
                  setSecret("");
                  setMesaj("Plata a fost procesată. Abonamentul se activează în câteva minute.");
                  setTimeout(() => router.refresh(), 3000);
                }}
                submitLabel={`Activează — ${pachet ? pachet.priceRon : ""} lei/lună`}
              />
            ) : (
              <Buton fel="principal" marime="mare" className="w-full" incarca={porneste} onClick={incepe}>
                Activează abonamentul
              </Buton>
            )
          )}
          {mesaj && <p className="mt-3 text-[12.5px] text-muted">{mesaj}</p>}
        </div>
      </Card>

      <Card>
        <CardCap titlu="Planuri" />
        <ul className="divide-y divide-line">
          {ALL_PACKAGES.map(p => {
            const info = CORPORATE_PACKAGES[p];
            const alSau = corporate.package === p;
            return (
              <li key={p} className={`flex items-center justify-between gap-4 px-5 py-3 ${alSau ? "bg-brand-dim" : ""}`}>
                <div>
                  <p className="text-[13.5px] font-medium text-ink">
                    {info.name}
                    {alSau && <span className="ml-2 text-[11.5px] font-normal text-brand-soft">planul dvs.</span>}
                  </p>
                  <p className="text-[12px] text-faint">
                    {info.maxAssoc >= 9999 ? "Dosare nelimitate" : `${info.maxAssoc} dosare`} · {info.docsPerDosar} documente/dosar
                  </p>
                </div>
                <span className="tnum shrink-0 text-[13px] text-muted">
                  {p === "enterprise" ? "Personalizat" : info.priceRon === 0 ? "Gratuit" : `${info.priceRon} lei/lună`}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1 border-t border-line px-5 py-3.5 text-[12px] text-faint">
          <p>Dosar suplimentar (30 documente incluse) — <span className="text-muted">40 lei</span></p>
          <p>Document peste limita dosarului — <span className="text-muted">1,30 lei</span></p>
          <p className="pt-1">
            Upgrade sau suplimentare: <a href="mailto:office@vosmart.ro" className="text-brand-soft hover:underline">office@vosmart.ro</a>
          </p>
        </div>
      </Card>
    </div>
  );
}
