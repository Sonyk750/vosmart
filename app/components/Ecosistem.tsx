/**
 * Blocul „Ecosistem" — identic (aceleasi site-uri, aceeasi ordine, aceleasi
 * etichete) pe toate site-urile familiei: SpokApp, SpokInvoice, SpokAdmin,
 * VoSmart si DecoImob. Linkurile reciproce sunt semnalul prin care Google si
 * crawlerele AI leaga site-urile de aceeasi entitate.
 *
 * URL-urile trebuie sa ramana sincronizate cu `sameAs` din `app/layout.tsx`.
 * Fiecare adresa e cea canonica a site-ului respectiv, ca sa nu trimitem
 * vizitatorii si robotii printr-un redirect inutil.
 */
export type EcosystemSite = { name: string; url: string; what: string };

export const ECOSYSTEM: EcosystemSite[] = [
  { name: "SpokApp", url: "https://www.spokapp.ro", what: "ecosistemul de aplicații" },
  { name: "SpokInvoice", url: "https://www.spokinvoice.ro", what: "facturare și e-Factura ANAF" },
  { name: "SpokAdmin", url: "https://spokadmin.ro", what: "administrare asociații de proprietari" },
  { name: "VoSmart", url: "https://www.vosmart.ro", what: "cenzorat asociații de proprietari" },
  { name: "DecoImob", url: "https://decoimob.ro", what: "administrare imobile București" },
];

/** Site-ul curent — se exclude singur din lista de linkuri. */
export const SELF_URL = "https://www.vosmart.ro";

export const ECOSYSTEM_OTHERS = ECOSYSTEM.filter(s => s.url !== SELF_URL);

export function Ecosistem({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        Ecosistem SpokApp
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
        {ECOSYSTEM_OTHERS.map(site => (
          <li key={site.url}>
            <a href={site.url} target="_blank" rel="noopener" className="transition hover:text-emerald-400">
              <span className="text-slate-400">{site.name}</span> — {site.what}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
