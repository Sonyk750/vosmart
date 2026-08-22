import Link from "next/link";
import { Card } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";

/**
 * Secțiune care există în meniu, dar nu e încă scrisă.
 *
 * Nu punem „coming soon" si nu ascundem intrarea din meniu. Meniul e harta
 * aplicatiei: daca lipseste o sectiune, omul nu stie ca urmeaza, iar daca apare
 * si duce intr-o pagina goala, nu stie daca s-a stricat ceva. Pagina asta spune
 * exact ce va face sectiunea si ce poate face intre timp.
 */
export default function InConstructie({
  titlu, descriere, pasi, urmatorul,
}: {
  titlu: string;
  descriere: string;
  /** Ce va putea face omul aici, in ordinea in care o va face. */
  pasi: string[];
  urmatorul?: { text: string; cale: string };
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold tracking-tight">{titlu}</h1>
      <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-faint">{descriere}</p>

      <Card className="mt-5 px-5 py-5">
        <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-faint">
          <Ic.ceas className="h-3.5 w-3.5" /> În construcție
        </p>
        <ol className="mt-3.5 space-y-2.5">
          {pasi.map((p, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-muted">
              <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line-strong text-[10.5px] font-semibold text-faint">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
        {urmatorul && (
          <Link href={urmatorul.cale}
            className="mt-5 inline-flex items-center gap-1.5 rounded-[var(--radius-field)] border border-line-strong bg-surface-3 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-4">
            {urmatorul.text} <Ic.dreapta className="h-3.5 w-3.5" />
          </Link>
        )}
      </Card>
    </div>
  );
}
