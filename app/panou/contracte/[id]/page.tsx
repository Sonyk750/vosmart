import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardCap, Eticheta, Gol } from "@/app/components/ui";
import { dataRo, Ton } from "@/app/components/baza";
import { Ic } from "@/app/components/icoane";

/**
 * Un contract, deschis.
 *
 * Deocamdata arata datele si lunile lui. Aici vor ajunge, pe rand, dosarele
 * fiecarei luni cu documentele, inventarul, raportul AI si raportul semnat —
 * pagina asta e locul lor.
 */

const STATUS: Record<string, { text: string; ton: Ton }> = {
  activ: { text: "Activ", ton: "ok" },
  suspendat: { text: "Suspendat", ton: "warn" },
  incheiat: { text: "Încheiat", ton: "neutru" },
};

export default async function PaginaContract({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) redirect("/login");

  const { id } = await params;
  const c = await prisma.contract.findUnique({
    where: { id },
    include: {
      dosare: {
        orderBy: [{ an: "desc" }, { createdAt: "desc" }],
        select: { id: true, luna: true, an: true, etapa: true, stareEtapa: true, scor: true, verdict: true },
      },
    },
  });
  if (!c) notFound();

  // Cenzorul vede doar contractele repartizate lui. Nu e repartizat niciunul
  // inca, dar regula sta scrisa de pe acum, nu dupa ce apare primul cont.
  if (user.role === "cenzor" && c.cenzorId !== user.id) notFound();

  const st = STATUS[c.status] ?? { text: c.status, ton: "neutru" as Ton };

  const randuri: [string, string | null][] = [
    ["CUI", c.cui],
    ["Nr. registrul comerțului", c.regCom],
    ["Adresă", [c.adresa, c.localitate].filter(Boolean).join(", ") || null],
    ["Telefon", c.telefon],
    ["Email", c.email],
    ["Reprezentant legal", c.reprezentant],
  ];

  const contract: [string, string | null][] = [
    ["Număr", c.numar],
    ["Data semnării", c.dataSemnarii ? dataRo(c.dataSemnarii) : null],
    ["Data încetării", c.dataIncetarii ? dataRo(c.dataIncetarii) : "durată nedeterminată"],
    ["Termen lunar", `ziua ${c.ziTermen}`],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/panou/contracte"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-ink">
        <Ic.stanga className="h-3.5 w-3.5" /> Contracte
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{c.denumire}</h1>
          <p className="mt-1 text-[13.5px] text-faint">
            CUI {c.cui}{c.numar && ` · contract ${c.numar}`}
          </p>
        </div>
        <Eticheta ton={st.ton}>{st.text}</Eticheta>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardCap titlu="Beneficiar" />
          <dl className="px-5 py-3">
            {randuri.map(([et, val]) => (
              <div key={et} className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
                <dt className="text-[12.5px] text-faint">{et}</dt>
                <dd className={`text-right text-[13px] ${val ? "text-ink" : "text-faint"}`}>{val ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardCap titlu="Contract" />
          <dl className="px-5 py-3">
            {contract.map(([et, val]) => (
              <div key={et} className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
                <dt className="text-[12.5px] text-faint">{et}</dt>
                <dd className={`text-right text-[13px] ${val ? "text-ink" : "text-faint"}`}>{val ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardCap
            titlu="Persoana desemnată"
            sub="Cine va putea descărca rapoartele semnate din contul ei."
          />
          {c.persoanaNume ? (
            <div className="flex flex-wrap gap-x-8 gap-y-2 px-5 py-4">
              <span className="text-[13px] text-ink">{c.persoanaNume}</span>
              {c.persoanaFunctie && <span className="text-[13px] text-muted">{c.persoanaFunctie}</span>}
              {c.persoanaEmail && <span className="text-[13px] text-muted">{c.persoanaEmail}</span>}
              {c.persoanaTelefon && <span className="text-[13px] text-muted">{c.persoanaTelefon}</span>}
            </div>
          ) : (
            <p className="flex items-start gap-2 px-5 py-4 text-[13px] text-warn">
              <Ic.info className="mt-0.5 h-4 w-4 shrink-0" />
              Nu e completată. Până atunci, rapoartele semnate rămân la noi — nu are cine să le ridice.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardCap titlu="Dosare lunare" sub="Fiecare lună, cu documentele și rapoartele ei." />
          {c.dosare.length === 0 ? (
            <Gol
              pictograma={<Ic.calendar className="h-5 w-5" />}
              titlu="Nicio lună începută"
              text="Când încarci documentele unei luni pentru acest contract, dosarul apare aici."
            />
          ) : (
            <ul className="divide-y divide-line">
              {c.dosare.map(d => (
                <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[13px] text-ink">{d.luna} {d.an}</span>
                  <span className="flex-1 text-[12px] text-faint">{d.etapa}</span>
                  {d.scor !== null && <span className="tnum text-[13px] text-muted">{d.scor}%</span>}
                  <Link href={`/panou/dosar/${d.id}`} className="text-faint transition-colors hover:text-ink">
                    <Ic.dreapta className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {c.observatii && (
          <Card className="lg:col-span-2">
            <CardCap titlu="Observații" />
            <p className="whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-muted">{c.observatii}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
