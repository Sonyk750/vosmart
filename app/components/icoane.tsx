import React from "react";

/**
 * Pictogramele aplicatiei.
 *
 * Stau intr-un modul SEPARAT de `ui.tsx`, si nu din cochetarie: `ui.tsx` e
 * marcat `"use client"`, iar un OBIECT exportat dintr-un modul de client nu se
 * poate citi pe proprietati dintr-o componenta de server. Next il preda ca
 * referinta de client, asa ca `Ic.panou` iese `undefined`, iar pagina cade cu
 * „Element type is invalid" — o eroare care nu spune deloc unde sa te uiti.
 *
 * Pictogramele n-au nevoie de nimic din browser, deci fisierul asta ramane
 * neutru si poate fi folosit din amandoua partile.
 *
 * De ce SVG si nu emoji: un „📁" se deseneaza altfel pe Windows, pe Mac si pe
 * Android, vine cu culoarea lui si nu se aliniaza cu textul. Cele de mai jos
 * mostenesc `currentColor` si stau drept.
 */

type IconProps = { className?: string };

const svg = (continut: React.ReactNode) =>
  function Icon({ className = "h-4 w-4" }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {continut}
      </svg>
    );
  };

export const Ic = {
  dosar: svg(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  fisier: svg(<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /></>),
  raport: svg(<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /><path d="M9 13h6M9 17h4" /></>),
  sus: svg(<><path d="M12 19V5M5 12l7-7 7 7" /></>),
  jos: svg(<><path d="M12 5v14M19 12l-7 7-7-7" /></>),
  stanga: svg(<><path d="M15 18l-6-6 6-6" /></>),
  dreapta: svg(<><path d="M9 6l6 6-6 6" /></>),
  bifa: svg(<><path d="M20 6L9 17l-5-5" /></>),
  x: svg(<><path d="M18 6L6 18M6 6l12 12" /></>),
  plus: svg(<><path d="M12 5v14M5 12h14" /></>),
  creion: svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  alerta: svg(<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>),
  info: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
  scut: svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>),
  ceas: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  cauta: svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  descarca: svg(<><path d="M12 3v12M7 11l5 5 5-5" /><path d="M5 21h14" /></>),
  cos: svg(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>),
  semnatura: svg(<><path d="M3 17c3 0 4-10 7-10s2 8 4 8 2-3 4-3 2 2 3 2" /><path d="M3 21h18" /></>),
  cheie: svg(<><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.2-8.2M17 6l2 2M14 9l2 2" /></>),
  iesire: svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
  balanta: svg(<><path d="M12 3v18M5 7h14M7 21h10" /><path d="M5 7 2 14h6zM19 7l-3 7h6z" /></>),
  scanteie: svg(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>),
  panou: svg(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>),
  flux: svg(<><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="10" rx="1.5" /><rect x="16" y="4" width="5" height="13" rx="1.5" /></>),
  contract: svg(<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /><path d="M8 17c1.6 0 2-4 3.5-4s1.4 3 2.5 3 1-1 2-1" /></>),
  utilizatori: svg(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.6a6.5 6.5 0 0 1 3.5 5.4" /></>),
  meniu: svg(<><path d="M3 6h18M3 12h18M3 18h18" /></>),
  calendar: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  panoulateral: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>),
};
