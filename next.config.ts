import type { NextConfig } from "next";

/**
 * Antetele de securitate, in doua feluri.
 *
 * Tot ce e comun sta in `COMUNE`. Singura diferenta e `X-Frame-Options`, si are
 * un motiv precis: documentele din dosar se deschid intr-un `<iframe>`, in
 * propria noastra pagina, ca sa poata cenzorul citi lista de plata langa
 * constatare. `DENY` interzice incadrarea INCLUSIV pe aceeasi origine, deci
 * previzualizarea iesea cu „www.vosmart.ro refused to connect" — noi ne blocam
 * singuri. Ruta documentelor primeste `SAMEORIGIN`; de pe alt domeniu tot nu se
 * poate incadra, iar CSP-ul rutei intareste cu `frame-ancestors 'self'`.
 *
 * Regula generala EXCLUDE ruta documentelor prin cautare negativa. Fara excludere
 * s-ar potrivi amandoua, ar pleca doua antete `X-Frame-Options`, iar browserul ar
 * lua-o pe cea mai stricta — adica tot `DENY`.
 */
const COMUNE = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // `sharp` are binare native (libvips). Trecut prin bundler ar fi rescris in
  // JavaScript si si-ar pierde legatura cu ele; lasat extern, e cerut la rulare
  // asa cum e instalat. Il folosim la recodarea scanarilor — vezi
  // `lib/cenzorat/optimizare.ts`.
  serverExternalPackages: ["sharp"],

  async headers() {
    return [
      {
        source: "/api/panou/fisiere/:cale*",
        headers: [...COMUNE, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/((?!api/panou/fisiere).*)",
        headers: [...COMUNE, { key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
