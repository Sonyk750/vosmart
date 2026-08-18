/**
 * Adresa canonica si imaginea OpenGraph, dintr-un singur loc.
 *
 * Imaginea era scrisa de mana ca `/opengraph-image.png` in opt fisiere — un URL
 * care nu exista: ruta generata de `app/opengraph-image.tsx` e `/opengraph-image`,
 * fara extensie. Rezultatul: 404 la partajare pe tot site-ul, in afara de pagina
 * principala, plus o imagine moarta declarata in schema Organization si
 * BlogPosting. De aici incolo, adresa se ia de aici.
 */
export const SITE_URL = "https://www.vosmart.ro";

/** Imaginea OpenGraph implicita, generata de `app/opengraph-image.tsx`. */
export const OG_IMAGE = `${SITE_URL}/opengraph-image`;

/**
 * Imaginea in forma pe care o cere `openGraph.images`.
 *
 * Trebuie pusa EXPLICIT pe orice pagina care isi declara propriul obiect
 * `openGraph`: acela inlocuieste complet ce vine din layout, deci imaginea din
 * file-convention nu se mai ataseaza singura.
 */
export const OG_IMAGE_ENTRY = {
  url: OG_IMAGE,
  width: 1200,
  height: 630,
  alt: "VoSmart — cenzorat asociații de proprietari",
} as const;
