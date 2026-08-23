import { createHash } from "crypto";

/**
 * Ce se intampla cu un document intre „a fost trimis" si „a fost pus la pastrare".
 *
 * MASURATOAREA CARE A DECIS FORMA ASTA. O scanare A4 la 300 dpi are 5–7 MB.
 * Comprimata cu gzip: 0% castig — un JPEG e deja comprimat pe dinauntru, iar un
 * al doilea strat nu mai are ce strange. Aceeasi pagina recodata la 2400 px pe
 * latura lunga (≈200 dpi) si calitate 82: 1,2 MB, adica 77% mai putin, cu textul
 * la fel de lizibil. Scanerele de birou lucreaza des chiar la 200 dpi.
 *
 * Deci nu comprimam — RECODAM, si doar imaginile. PDF-urile, Word-ul si Excel-ul
 * trec neatinse: la ele nu era nimic de castigat, iar un PDF rescris de noi ar fi
 * un PDF pe care nu l-a mai vazut nimeni.
 *
 * AMPRENTA. Recodarea inseamna ca fisierul pastrat nu mai e, bit cu bit, cel
 * trimis de asociatie. Intr-un dosar de cenzorat asta conteaza: intrebarea „ce
 * mi-ati trimis de fapt?" trebuie sa aiba raspuns. De aceea calculam sha256 pe
 * octetii ORIGINALI, inainte de orice atingere, si il pastram langa document.
 * Cine are fisierul de la asociatie poate oricand sa arate ca e acelasi, chiar
 * daca ce tinem noi e o versiune mai usoara a lui.
 */

/** Latura lunga la care coboram scanarile. 2400 px pe A4 ≈ 200 dpi. */
export const LATURA_MAXIMA = 2400;

/** Calitatea JPEG. Sub 80 apar artefacte in jurul cifrelor mici din tabele. */
export const CALITATE = 82;

/** Sub atat nu ne atingem de imagine: castigul n-ar acoperi pierderea. */
const PRAG_OCTETI = 300 * 1024;

/**
 * De la ce marime in sus un PNG e sigur o scanare, nu un desen.
 *
 * Distinctia conteaza: JPEG-ul e facut pentru hartie fotografiata, si strange
 * enorm din ea, dar in jurul literelor mici dintr-o captura de ecran lasa un
 * halou. Numai ca o captura de ecran cu un tabel are 200–500 KB, pe cand o
 * pagina A4 scanata si salvata ca PNG trece de 5 MB. Marimea desparte cele doua
 * cazuri mai bine decat orice masuratoare de continut: o scanare curata a unei
 * foi albe cu text negru arata, statistic, exact ca o captura de ecran.
 */
const PRAG_PNG_SCANARE = 1024 * 1024;

/** Daca recodarea nu scade cu cel putin atat, pastram originalul. */
const CASTIG_MINIM = 0.2;

export type Pregatit = {
  /** Octetii care se duc efectiv in stocare. */
  continut: Buffer;
  /** Tipul octetilor de mai sus — poate diferi de ce a trimis browserul. */
  mimeType: string;
  /** sha256 al fisierului ORIGINAL, in hex. Dovada a ce s-a primit. */
  amprenta: string;
  marimeOriginala: number;
  /** A fost recodat? Cand e `false`, continutul e chiar originalul. */
  optimizat: boolean;
};

function amprentaLui(brut: Buffer): string {
  return createHash("sha256").update(brut).digest("hex");
}

/**
 * Pregateste un fisier pentru pastrare.
 *
 * Nu arunca niciodata: daca recodarea da gres — imagine trunchiata, format
 * exotic, memorie — se pastreaza originalul. Un document mai mare e o problema
 * de factura; un document pierdut e o problema de cenzorat.
 */
export async function pregatesteFisier(
  brut: Buffer,
  mimeType: string,
): Promise<Pregatit> {
  const deBaza: Pregatit = {
    continut: brut,
    mimeType,
    amprenta: amprentaLui(brut),
    marimeOriginala: brut.length,
    optimizat: false,
  };

  if (!mimeType.startsWith("image/") || brut.length < PRAG_OCTETI) return deBaza;

  // Un PNG mic ramane PNG: e un desen sau o captura de ecran, iar acolo JPEG-ul
  // ar strica tocmai literele. Restul — JPEG, WEBP si PNG-urile mari, adica
  // scanarile — ies ca JPEG.
  const catreJpeg = !(mimeType === "image/png" && brut.length < PRAG_PNG_SCANARE);

  try {
    const { default: sharp } = await import("sharp");

    const asezata = sharp(brut, { failOn: "none" })
      // `rotate()` fara argument coboara orientarea din EXIF in pixeli. Fara ea,
      // pozele de telefon ies culcate: metadatele se pierd la recodare, si odata
      // cu ele instructiunea „roteste".
      .rotate()
      .resize({ width: LATURA_MAXIMA, height: LATURA_MAXIMA, fit: "inside", withoutEnlargement: true });

    const usor = catreJpeg
      ? await asezata
          // JPEG-ul nu stie de transparenta. Fara asta, un PNG cu fundal
          // transparent iese cu fundal NEGRU — verificat, exact asa se intampla.
          // Alb, fiindca un document se uita la hartie.
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: CALITATE, mozjpeg: true, progressive: true })
          .toBuffer()
      // PNG-ul care ramane PNG nu se aplatizeaza: aici transparenta e parte din
      // desen, iar recodarea e fara pierderi — se castiga doar din compresie.
      : await asezata.png({ compressionLevel: 9, effort: 10 }).toBuffer();

    if (usor.length > brut.length * (1 - CASTIG_MINIM)) return deBaza;

    return { ...deBaza, continut: usor, mimeType: catreJpeg ? "image/jpeg" : "image/png", optimizat: true };
  } catch (e) {
    console.warn("[optimizare] imaginea nu a putut fi recodată, se păstrează originalul:", e);
    return deBaza;
  }
}

/**
 * Numele sub care iese documentul la descarcare.
 *
 * Numele original ramane in baza, asa cum l-a trimis asociatia — el e cel din
 * corespondenta. Dar cand un „lista.png" a fost recodat ca JPEG, browserul
 * trebuie sa primeasca „lista.jpg": altfel salveaza octeti JPEG intr-un fisier
 * cu extensie PNG, si primul program care il deschide se plange.
 */
export function numeDupaMime(numeFisier: string, mimeType: string): string {
  const potrivite: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
  };
  const cerut = potrivite[mimeType];
  if (!cerut) return numeFisier;

  const i = numeFisier.lastIndexOf(".");
  const ext = i === -1 ? "" : numeFisier.slice(i).toLowerCase();
  if (ext === cerut || (cerut === ".jpg" && ext === ".jpeg")) return numeFisier;

  return (i === -1 ? numeFisier : numeFisier.slice(0, i)) + cerut;
}
