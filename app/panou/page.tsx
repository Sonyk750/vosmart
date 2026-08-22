import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Card, CardCap, Gol } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";
import { lunaDeLucru, sumarPanou } from "./date";

/**
 * Panoul: prima pagina pe care o vezi dimineata.
 *
 * Nu incearca sa arate tot ce se poate numara. Raspunde la doua intrebari, in
 * ordinea asta: „cat am de facut ACUM?" si „unde a ajuns luna?". Cifrele de
 * bilant — cate contracte, cate rapoarte — vin dupa, fiindca nu iti schimba
 * ziua.
 */

const TON_POZITIE: Record<string, { punct: string; text: string }> = {
  lipsa: { punct: "bg-bad", text: "text-bad" },
  primite: { punct: "bg-info", text: "text-info" },
  verificare: { punct: "bg-brand", text: "text-brand-soft" },
  revizuire: { punct: "bg-warn", text: "text-warn" },
  semnat: { punct: "bg-ok", text: "text-ok" },
};

export default async function PaginaPanou() {
  const user = await requireAdmin();
  if (!user) redirect("/login?next=/panou");

  const s = await sumarPanou(user);
  const luna = lunaDeLucru();
  const proprietar = user.role === "admin";

  const deFacut = [
    s.deVerificat > 0 && {
      cale: "/panou/rapoarte-ai",
      pictograma: <Ic.scanteie className="h-4 w-4" />,
      ton: "brand" as const,
      numar: s.deVerificat,
      text: s.deVerificat === 1 ? "dosar așteaptă verificarea AI" : "dosare așteaptă verificarea AI",
      actiune: "Rulează verificarea",
    },
    s.laExpert > 0 && {
      cale: "/panou/rapoarte-expert",
      pictograma: <Ic.semnatura className="h-4 w-4" />,
      ton: "warn" as const,
      numar: s.laExpert,
      text: s.laExpert === 1 ? "dosar așteaptă raportul expertului" : "dosare așteaptă raportul expertului",
      actiune: "Deschide pupitrul",
    },
    s.esuate > 0 && {
      cale: "/panou/flux",
      pictograma: <Ic.alerta className="h-4 w-4" />,
      ton: "bad" as const,
      numar: s.esuate,
      text: s.esuate === 1 ? "dosar s-a oprit cu eroare" : "dosare s-au oprit cu eroare",
      actiune: "Vezi ce s-a întâmplat",
    },
  ].filter(Boolean) as {
    cale: string; pictograma: React.ReactNode; ton: "brand" | "warn" | "bad";
    numar: number; text: string; actiune: string;
  }[];

  const totalPozitii = s.pePozitii.reduce((t, p) => t + p.numar, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {salut()}{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-[13.5px] text-faint">
          Luna de lucru: <strong className="font-medium text-muted">{luna.eticheta}</strong>
        </p>
      </header>

      {/* ------------------------------------------------- de făcut acum */}
      {deFacut.length > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deFacut.map(d => (
            <Link key={d.cale} href={d.cale} className="group">
              <Card className={`h-full px-4 py-4 transition-colors ${
                d.ton === "warn" ? "border-warn/25 bg-warn-dim/40 hover:bg-warn-dim/60"
                : d.ton === "bad" ? "border-bad/25 bg-bad-dim/40 hover:bg-bad-dim/60"
                : "border-brand/25 bg-brand-dim/60 hover:bg-brand-dim"
              }`}>
                <div className={`flex items-center gap-2 ${
                  d.ton === "warn" ? "text-warn" : d.ton === "bad" ? "text-bad" : "text-brand-soft"
                }`}>
                  {d.pictograma}
                  <span className="tnum text-[24px] font-semibold leading-none">{d.numar}</span>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-ink">{d.text}</p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] text-muted transition-transform group-hover:translate-x-0.5">
                  {d.actiune} <Ic.dreapta className="h-3.5 w-3.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mb-6 flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ok/30 bg-ok-dim text-ok">
            <Ic.bifa className="h-4 w-4" />
          </span>
          <p className="text-[13.5px] text-muted">
            Nimic nu așteaptă acțiunea ta acum.
            {s.contracte === 0 && " Începe prin a adăuga primul contract."}
          </p>
        </Card>
      )}

      {/* --------------------------------------------------- flux lunar */}
      <Card className="mb-6 overflow-hidden">
        <CardCap
          titlu={`Unde a ajuns ${luna.eticheta}`}
          sub={`${s.dosareLunaCurenta} din ${s.contracte} ${s.contracte === 1 ? "contract are" : "contracte au"} documente pentru luna asta`}
          actiune={
            <Link href="/panou/flux"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-4">
              Deschide fluxul <Ic.dreapta className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {totalPozitii === 0 ? (
          <Gol
            pictograma={<Ic.calendar className="h-5 w-5" />}
            titlu="Luna nu a început încă"
            text="Când intră primele documente, aici vezi fiecare contract pe etapa lui."
          />
        ) : (
          <div className="px-5 py-4">
            {/* Banda: fiecare etapa ocupa cat ii da numarul de contracte. Un
                singur rand spune mai mult decat cinci cifre puse una langa alta. */}
            <div className="mb-3.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-4">
              {s.pePozitii.filter(p => p.numar > 0).map(p => (
                <div
                  key={p.etapa}
                  className={TON_POZITIE[p.etapa]?.punct ?? "bg-muted"}
                  style={{ width: `${(p.numar / totalPozitii) * 100}%` }}
                  title={`${p.eticheta}: ${p.numar}`}
                />
              ))}
            </div>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.pePozitii.map(p => (
                <li key={p.etapa} className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.numar > 0 ? TON_POZITIE[p.etapa]?.punct : "bg-line-strong"}`} />
                  <span className={`flex-1 text-[13px] ${p.numar > 0 ? "text-muted" : "text-faint"}`}>{p.eticheta}</span>
                  <span className={`tnum text-[13px] font-semibold ${p.numar > 0 ? TON_POZITIE[p.etapa]?.text : "text-faint"}`}>
                    {p.numar}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------- bilanț */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra pictograma={<Ic.contract className="h-4 w-4" />} valoare={s.contracte}
          eticheta={s.contracte === 1 ? "Contract" : "Contracte"} cale="/panou/contracte" />
        <Cifra pictograma={<Ic.dosar className="h-4 w-4" />} valoare={s.dosareLunaCurenta}
          eticheta={`Dosare în ${luna.luna}`} cale="/panou/flux" />
        <Cifra pictograma={<Ic.scanteie className="h-4 w-4" />} valoare={s.rapoarteAi}
          eticheta="Rapoarte AI" cale="/panou/rapoarte-ai" />
        <Cifra pictograma={<Ic.semnatura className="h-4 w-4" />} valoare={s.rapoarteExpert}
          eticheta="Rapoarte semnate" cale="/panou/rapoarte-expert" />
      </div>

      {proprietar && s.contracte === 0 && (
        <Card className="mt-6 px-5 py-5">
          <p className="text-[14px] font-medium text-ink">Nu ai încă niciun contract</p>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-faint">
            Un contract ține o asociație sau o firmă, datele ei de identificare și persoana care
            are voie să descarce rapoartele semnate. De acolo pornește tot restul.
          </p>
          <Link href="/panou/contracte"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-field)] bg-brand px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-brand/85">
            <Ic.plus className="h-4 w-4" /> Adaugă primul contract
          </Link>
        </Card>
      )}
    </div>
  );
}

function Cifra({ pictograma, valoare, eticheta, cale }: {
  pictograma: React.ReactNode; valoare: number; eticheta: string; cale: string;
}) {
  return (
    <Link href={cale} className="group">
      <Card className="h-full px-4 py-3.5 transition-colors hover:bg-surface-3">
        <div className="flex items-center gap-2 text-faint transition-colors group-hover:text-muted">
          {pictograma}
        </div>
        <p className="tnum mt-2 text-[24px] font-semibold leading-none tracking-tight text-ink">{valoare}</p>
        <p className="mt-1.5 text-[12px] text-faint">{eticheta}</p>
      </Card>
    </Link>
  );
}

function salut(): string {
  const ora = new Date().getHours();
  if (ora < 5) return "Noapte bună";
  if (ora < 12) return "Bună dimineața";
  if (ora < 18) return "Bună ziua";
  return "Bună seara";
}
