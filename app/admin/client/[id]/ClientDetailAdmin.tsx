"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Card, CardCap, dataRo, Eticheta, Gol, Ic, InelScor, Statistica, Ton,
} from "@/app/components/ui";

/**
 * Fisa unei asociatii, pentru cenzor.
 *
 * Pagina asta continea pana acum si un al doilea pupitru de revizuire: un
 * `<textarea>`, un buton „Draft AI" care pornea inca o analiza fara sa vada
 * documentele, si „Aprobă & Publică", care salva ce era in casuta. Toate au
 * plecat — revizuirea are un singur loc, `/admin/dosar/[id]`, unde documentul
 * sta langa constatare.
 *
 * Ce ramane aici e o fisa: cine e asociatia, ce dosare a trimis si unde s-a
 * ajuns cu fiecare. Fiecare rand duce undeva.
 */

interface Document {
  id: string; title: string; type: string; fileName: string;
  status: string; aiScore: number | null; verdict: string | null;
  etapa: string | null; stareEtapa: string | null; incredere: number | null;
  month: string | null; year: number | null; createdAt: string;
}
interface Report {
  id: string; title: string; status: string;
  month: string | null; year: number | null;
  semnatDe: string | null; semnatLa: string | null; createdAt: string;
}
interface Association {
  id: string; name: string; package: string;
  cui: string | null; address: string | null; phone: string | null;
  user: { name: string | null; email: string };
  documents: Document[];
  reports: Report[];
}

const VERDICT: Record<string, { text: string; ton: Ton }> = {
  conform: { text: "Conform", ton: "ok" },
  observatii: { text: "Cu observații", ton: "info" },
  neconform: { text: "Neconform", ton: "warn" },
  grav: { text: "Deficiențe grave", ton: "bad" },
};

const ETAPA: Record<string, { text: string; ton: Ton }> = {
  intrare: { text: "Se preia", ton: "brand" },
  extragere: { text: "Se citesc documentele", ton: "brand" },
  verificare: { text: "Se verifică", ton: "brand" },
  sinteza: { text: "Se sintetizează", ton: "brand" },
  revizuire: { text: "Așteaptă revizuirea", ton: "warn" },
  semnat: { text: "Semnat", ton: "ok" },
};

export default function ClientDetailAdmin({ association }: {
  association: Association;
  adminUser: { id: string; name: string | null; email: string; role: string };
}) {
  const deRevizuit = association.documents.filter(d => d.etapa === "revizuire").length;
  const semnate = association.reports.filter(r => r.status === "published").length;

  return (
    <main className="min-h-screen bg-app text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-app/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-ink">
            <Ic.stanga className="h-3.5 w-3.5" /> Panou
          </Link>
          <Image src="/logo-vosmart.png" alt="VoSmart" width={64} height={28}
            className="h-auto" style={{ mixBlendMode: "screen", width: "58px" }} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* ------------------------------------------------------ fișa */}
        <div className="mb-5">
          <h1 className="text-[21px] font-semibold tracking-tight">{association.name}</h1>
          <p className="mt-1 text-[13px] text-faint">
            {[
              association.user.email,
              association.cui && `CUI ${association.cui}`,
              association.phone,
              association.address,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Statistica pictograma={<Ic.dosar className="h-4 w-4" />} valoare={association.documents.length} eticheta="Dosare primite" />
          <Statistica
            pictograma={<Ic.ceas className="h-4 w-4" />}
            valoare={deRevizuit}
            eticheta="Așteaptă revizuirea"
            ton={deRevizuit > 0 ? "warn" : "neutru"}
          />
          <Statistica pictograma={<Ic.semnatura className="h-4 w-4" />} valoare={semnate} eticheta="Rapoarte semnate" ton="ok" />
          <Statistica
            pictograma={<Ic.cheie className="h-4 w-4" />}
            valoare={association.package === "premium" ? "Premium" : "Smart"}
            eticheta="Pachet"
          />
        </div>

        {/* -------------------------------------------------- dosarele */}
        <Card className="mb-4 overflow-hidden">
          <CardCap titlu="Dosare trimise" sub="Deschide un dosar ca să vezi documentele lângă constatări." />
          {association.documents.length === 0 ? (
            <Gol
              pictograma={<Ic.dosar className="h-5 w-5" />}
              titlu="Niciun dosar trimis"
              text="Asociația nu a încărcat încă documente pentru verificare."
            />
          ) : (
            <ul className="divide-y divide-line">
              {association.documents.map(d => {
                const verdict = d.verdict ? VERDICT[d.verdict] : null;
                const etapa = d.etapa ? ETAPA[d.etapa] : null;
                const esuat = d.stareEtapa === "esuata" || d.status === "error";
                const areScor = d.aiScore !== null && (d.etapa === "revizuire" || d.etapa === "semnat");

                return (
                  <li key={d.id}>
                    <Link href={`/admin/dosar/${d.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-3">
                      <span className="shrink-0">
                        {areScor ? (
                          <InelScor valoare={d.aiScore as number} ton={verdict?.ton ?? "neutru"} marime={44} />
                        ) : (
                          <span className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                            esuat ? "border-bad/40 bg-bad-dim text-bad" : "border-line-strong bg-surface-3 text-faint"
                          }`}>
                            {esuat ? <Ic.alerta className="h-4 w-4" /> : <Ic.dosar className="h-4 w-4" />}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{d.title}</p>
                        <p className="text-[12px] text-faint">
                          {[d.month && d.year && `${d.month} ${d.year}`, `primit ${dataRo(d.createdAt)}`,
                            d.incredere !== null && `încredere date ${d.incredere}%`].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      <span className="flex shrink-0 items-center gap-2">
                        {esuat ? <Eticheta ton="bad">Oprit</Eticheta>
                          : verdict ? <Eticheta ton={verdict.ton}>{verdict.text}</Eticheta>
                          : etapa ? <Eticheta ton={etapa.ton}>{etapa.text}</Eticheta>
                          : null}
                        <Ic.dreapta className="h-4 w-4 text-faint" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* -------------------------------------------------- rapoarte */}
        {association.reports.length > 0 && (
          <Card className="overflow-hidden">
            <CardCap titlu="Rapoarte" />
            <ul className="divide-y divide-line">
              {association.reports.map(r => {
                const semnat = r.status === "published";
                return (
                  <li key={r.id}>
                    <Link href={`/raport/${r.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        semnat ? "border-ok/30 bg-ok-dim text-ok" : "border-line-strong bg-surface-3 text-faint"
                      }`}>
                        {semnat ? <Ic.semnatura className="h-4 w-4" /> : <Ic.raport className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{r.title}</p>
                        <p className="text-[12px] text-faint">
                          {semnat
                            ? `semnat${r.semnatDe ? ` de ${r.semnatDe}` : ""}${r.semnatLa ? ` · ${dataRo(r.semnatLa)}` : ""}`
                            : `proiect · ${dataRo(r.createdAt)}`}
                        </p>
                      </div>
                      {!semnat && <Eticheta ton="warn">Nesemnat</Eticheta>}
                      <Ic.dreapta className="h-4 w-4 shrink-0 text-faint" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
