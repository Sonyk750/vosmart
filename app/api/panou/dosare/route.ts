import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { poateVedeaContractul } from "@/lib/acces";
import { salveazaFisier, stocareConfigurata } from "@/lib/stocare";
import { eticheta as etichetaTip, lipsuri } from "@/lib/cenzorat/documente";
import { dinNume, inventariaza } from "@/lib/cenzorat/inventar";
import { esteAcceptat, formatul, mimeDupaNume, FORMATE_TEXT, LIMITA_FISIER_MB } from "@/lib/cenzorat/formate";
import { numeDupaMime, pregatesteFisier } from "@/lib/cenzorat/optimizare";
import { ruleazaFlux } from "@/lib/cenzorat/pipeline";
import type { FisierDeCitit } from "@/lib/cenzorat/extragere";
import { numarLuna, numeLuna } from "@/lib/luni";

/**
 * Dosarul unei luni: ce e deja in el si ce mai intra.
 *
 * O singura usa pentru incarcare, si e aceeasi si la primul teanc de documente,
 * si la al treilea. Asociatia rar trimite tot deodata: vine lista de plata luni
 * si facturile joi. De aceea dosarul se GASESTE sau se creeaza — nu se face unul
 * nou la fiecare incarcare (baza nici n-ar lasa: o luna, un dosar).
 *
 * Verificarea AI nu porneste singura. Costa bani la fiecare rulare, iar pe un
 * dosar pe sfert plin n-ar avea ce citi. Cine incarca spune explicit daca trimite
 * la verificare acum sau doar depune documentele si asteapta restul.
 */

export const runtime = "nodejs";
// Citirea documentelor de catre model tine, la un dosar plin, mai mult decat
// implicitul. Raspunsul catre om pleaca oricum inainte — vezi `after` la final.
export const maxDuration = 300;

/** Cate fisiere se pot trimite dintr-o data. Peste atat, e o greseala de selectie. */
const MAX_FISIERE = 40;

const AN_MINIM = 2015;

type Tinta = { contractId: string; luna: string; an: number } | { eroare: string; cod: number };

/** Contractul si luna, verificate impreuna: fara ele nu exista dosar. */
function citesteTinta(contractId: unknown, lunaBruta: unknown, anBrut: unknown): Tinta {
  if (typeof contractId !== "string" || !contractId.trim()) {
    return { eroare: "Alege contractul pentru care sunt documentele.", cod: 400 };
  }

  // Luna vine fie ca nume („august"), fie ca numar din casuta de selectie („8").
  const text = String(lunaBruta ?? "").trim().toLowerCase();
  const luna = /^\d+$/.test(text) ? numeLuna(parseInt(text, 10)) : (numarLuna(text) ? text : null);
  if (!luna) return { eroare: "Luna nu este validă.", cod: 400 };

  const an = Number(anBrut);
  const anCurent = new Date().getFullYear();
  if (!Number.isInteger(an) || an < AN_MINIM || an > anCurent + 1) {
    return { eroare: "Anul nu este valid.", cod: 400 };
  }

  return { contractId: contractId.trim(), luna, an };
}

/* -------------------------------------------------------------------- GET */

/** Ce se trimite despre un dosar catre ecranul de incarcare. */
const CAMPURI_DOSAR = {
  id: true, luna: true, an: true, titlu: true,
  etapa: true, stareEtapa: true, incredere: true, scor: true, verdict: true, rezumat: true,
  tokensIn: true, tokensOut: true, terminatLa: true,
  // Din ea afla ecranul cate documente mai are de citit o reluare — adica pe ce dă banii.
  fisiereCitite: true,
  createdAt: true, updatedAt: true,
  // Doar severitatea si starea, nu constatarile intregi: ecranul de rapoarte are
  // nevoie sa le numere pe categorii, nu sa le citeasca. Cele respinse de cenzor
  // nu mai intra in scor, deci `stare` trebuie sa vina cu ele.
  constatari: { select: { severitate: true, stare: true, sursa: true } },
  fisiere: {
    select: {
      id: true, numeFisier: true, tip: true, eticheta: true, mimeType: true,
      marime: true, marimeOriginala: true, amprenta: true, optimizat: true,
      denumireAi: true, emitentAi: true, perioadaAi: true, tipSursa: true, createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/**
 * Dosarele unui contract — toate, sau doar cel al unei luni.
 *
 * Fara `luna` si `an` intoarce lista lunilor, care e chiar ecranul de incarcare:
 * un rand pe luna, cu tot ce s-a strans in el. Cu `luna` si `an` intoarce un
 * singur dosar, ca sa se poata vedea inainte de trimitere ce e deja acolo — si
 * sa nu intre lista de plata a doua oara.
 */
export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const cauta = new URL(req.url).searchParams;
  const contractId = (cauta.get("contractId") ?? "").trim();
  if (!contractId) {
    return NextResponse.json({ error: "Alege contractul." }, { status: 400 });
  }
  if (!(await poateVedeaContractul(user, contractId))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  /* ------------------------------------------------------- toate lunile */

  if (!cauta.get("luna") && !cauta.get("an")) {
    const dosare = await prisma.dosar.findMany({
      where: { contractId },
      select: CAMPURI_DOSAR,
    });

    // Ordonarea se face aici, nu in interogare: `luna` e un cuvant („august"),
    // deci baza l-ar aseza alfabetic — aprilie inaintea lui august, august
    // inaintea lui februarie. Cea mai recenta luna sta prima.
    dosare.sort((a, b) => b.an - a.an || (numarLuna(b.luna) ?? 0) - (numarLuna(a.luna) ?? 0));

    return NextResponse.json({ dosare });
  }

  /* ------------------------------------------------------ o singura luna */

  const tinta = citesteTinta(contractId, cauta.get("luna"), cauta.get("an"));
  if ("eroare" in tinta) return NextResponse.json({ error: tinta.eroare }, { status: tinta.cod });

  const dosar = await prisma.dosar.findUnique({
    where: { contractId_an_luna: { contractId, an: tinta.an, luna: tinta.luna } },
    select: CAMPURI_DOSAR,
  });

  return NextResponse.json({ dosar });
}

/* ------------------------------------------------------------------- POST */

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    // Cererea a picat pe drum, aproape sigur fiindca era prea mare ca sa ajunga
    // intreaga. Spunem limita, nu „eroare de rețea".
    return NextResponse.json(
      { error: `Documentul nu a ajuns intact la server. Limita platformei este de ${LIMITA_FISIER_MB} MB pe cerere.` },
      { status: 413 },
    );
  }

  const tinta = citesteTinta(form.get("contractId"), form.get("luna"), form.get("an"));
  if ("eroare" in tinta) return NextResponse.json({ error: tinta.eroare }, { status: tinta.cod });

  const contract = await prisma.contract.findUnique({
    where: { id: tinta.contractId },
    select: { id: true, denumire: true },
  });
  if (!contract) return NextResponse.json({ error: "Contractul nu există." }, { status: 404 });
  if (!(await poateVedeaContractul(user, contract.id))) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  /* ------------------------------------------------------- ce s-a trimis */

  const fisiere = form.getAll("fisiere").filter((f): f is File => f instanceof File && f.size > 0);
  const tipuri = form.getAll("tipuri").map(String);
  const porneste = form.get("porneste") === "1";

  if (fisiere.length === 0) {
    return NextResponse.json({ error: "Nu ai atașat niciun document." }, { status: 400 });
  }
  if (fisiere.length > MAX_FISIERE) {
    return NextResponse.json(
      { error: `Prea multe fișiere deodată (${fisiere.length}). Trimite cel mult ${MAX_FISIERE} pe încărcare.` },
      { status: 400 },
    );
  }

  const refuzat = fisiere.find(f => !esteAcceptat(f.name));
  if (refuzat) {
    return NextResponse.json(
      { error: `Fișierul „${refuzat.name}" nu are un format acceptat. Se primesc ${FORMATE_TEXT}.` },
      { status: 415 },
    );
  }

  const totalOcteti = fisiere.reduce((s, f) => s + f.size, 0);
  // Verificarea e pe FIECARE fisier, nu pe teanc: limita platformei e pe cerere,
  // iar ecranul trimite cate un fisier pe cerere. Oricum, o cerere mai mare
  // decat atat n-ar ajunge pana aici — ar fi respinsa inainte.
  const greu = fisiere.find(f => f.size > LIMITA_FISIER_MB * 1024 * 1024);
  if (greu) {
    return NextResponse.json(
      {
        error: `„${greu.name}" are ${(greu.size / 1024 / 1024).toFixed(1)} MB, peste limita de ${LIMITA_FISIER_MB} MB pe fișier.`,
      },
      { status: 413 },
    );
  }

  if (!stocareConfigurata()) {
    // Inainte, `salveazaFisier` intorcea `null` si incarcarea mergea mai departe:
    // dosarul iesea cu raport, dar fara niciun document de redeschis, iar
    // cenzorul afla abia cand dadea sa se uite in lista de plata. Aici
    // documentele sunt scopul, deci lipsa stocarii opreste, nu se strecoara.
    console.error("[dosar] BLOB_READ_WRITE_TOKEN lipsește — nu se poate primi niciun document");
    return NextResponse.json(
      { error: "Stocarea documentelor nu este configurată pe server. Anunță administratorul." },
      { status: 503 },
    );
  }

  /* ------------------------------------------------ dosarul lunii, gasit */

  const cheie = { contractId_an_luna: { contractId: contract.id, an: tinta.an, luna: tinta.luna } };
  const campuriDosar = { id: true, etapa: true, _count: { select: { fisiere: true } } };

  // Ecranul trimite documentele in paralel, deci doua cereri pot cadea pe aceeasi
  // luna inainte ca ea sa existe. `upsert` nu e atomic fata de o alta conexiune:
  // amandoua vad „nu exista" si amandoua incearca sa creeze, iar a doua se loveste
  // de cheia unica „un contract, o luna". Atunci dosarul exista deja — il luam.
  let dosar;
  try {
    dosar = await prisma.dosar.upsert({
      where: cheie,
      update: {},
      create: {
        contractId: contract.id,
        luna: tinta.luna,
        an: tinta.an,
        titlu: `${contract.denumire} — ${tinta.luna} ${tinta.an}`,
        etapa: "intrare",
        stareEtapa: "asteptare",
      },
      select: campuriDosar,
    });
  } catch {
    const gasit = await prisma.dosar.findUnique({ where: cheie, select: campuriDosar });
    if (!gasit) {
      return NextResponse.json({ error: "Dosarul lunii nu a putut fi deschis." }, { status: 500 });
    }
    dosar = gasit;
  }

  // Un dosar semnat e inchis: raportul cenzorului s-a dat deja pe documentele de
  // atunci. Ce vine dupa nu se strecoara sub semnatura lui.
  if (dosar.etapa === "semnat") {
    return NextResponse.json(
      { error: `Dosarul pe ${tinta.luna} ${tinta.an} are deja raport semnat. Documentele noi nu se mai pot adăuga la el.` },
      { status: 409 },
    );
  }

  const eraGol = dosar._count.fisiere === 0;

  /* ------------------------------------------------------------ pastrare */

  const dosarBlob = `dosare/${contract.id}/${tinta.an}-${String(numarLuna(tinta.luna)).padStart(2, "0")}`;
  const marca = Date.now();

  const pentruCitire: FisierDeCitit[] = [];
  const randuri: {
    dosarId: string; tip: string; eticheta: string; numeFisier: string;
    blobUrl: string; mimeType: string; marime: number;
    marimeOriginala: number; amprenta: string; optimizat: boolean;
    denumireAi: string | null; emitentAi: string | null; perioadaAi: string | null; tipSursa: string;
  }[] = [];
  const nesalvate: string[] = [];
  let octetiPastrati = 0;

  // Recodarea intai: inventarul citeste exact octetii care raman in dosar, nu
  // originalul. Altfel ar descrie un document pe care nimeni nu-l mai deschide.
  const pregatite: { brut: Buffer; gata: Awaited<ReturnType<typeof pregatesteFisier>>; nume: string }[] = [];
  for (const f of fisiere) {
    const brut = Buffer.from(await f.arrayBuffer());
    pregatite.push({ brut, gata: await pregatesteFisier(brut, mimeDupaNume(f.name, f.type)), nume: f.name });
  }

  // INVENTARUL. Modelul deschide fiecare document si spune ce e — nu se ia dupa
  // numele fisierului, care la facturile scoase din programele de administrare
  // nu spune nici ce e documentul, nici de la cine vine.
  const inventar = await inventariaza(
    pregatite.map(p => ({ continut: p.gata.continut, numeFisier: p.nume, mimeType: p.gata.mimeType })),
  );

  for (let i = 0; i < fisiere.length; i++) {
    const f = fisiere[i];
    const { gata } = pregatite[i];

    // Tipul pus cu mana de cenzor bate tot. In rest comanda ce s-a citit din
    // document; ghicitul din nume ramane doar pentru ce n-a putut fi citit —
    // Word, Excel, arhive, sau un document pe care modelul nu l-a inteles.
    const pusDeOm = tipuri[i] && tipuri[i] !== "altele" && tipuri[i] !== "auto" ? tipuri[i] : null;
    const citit = inventar.citiri[i] ?? dinNume(f.name);
    const tip = pusDeOm ?? citit.tip;
    const tipSursa = pusDeOm ? "om" : citit.tipSursa;

    const numeSigur = `${tip}_${marca}_${i}_${numeDupaMime(f.name, gata.mimeType).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const salvat = await salveazaFisier(`${dosarBlob}/${numeSigur}`, gata.continut, gata.mimeType);
    if (!salvat) {
      nesalvate.push(f.name);
      continue;
    }
    octetiPastrati += salvat.size;

    randuri.push({
      dosarId: dosar.id,
      tip,
      // Eticheta ramane numele tipului („Facturi furnizori"); ce a citit modelul
      // sta separat, in `denumireAi`, ca sa se vada amandoua: felul si bucata.
      eticheta: etichetaTip(tip),
      numeFisier: f.name,
      blobUrl: salvat.url,
      mimeType: gata.mimeType,
      marime: salvat.size,
      marimeOriginala: gata.marimeOriginala,
      amprenta: gata.amprenta,
      optimizat: gata.optimizat,
      denumireAi: citit.denumire || null,
      emitentAi: citit.emitent || null,
      perioadaAi: citit.perioada || null,
      tipSursa,
    });
    pentruCitire.push({ tip, numeFisier: f.name, mimeType: gata.mimeType, continut: gata.continut });
  }

  if (randuri.length === 0) {
    return NextResponse.json(
      { error: "Niciun document nu a putut fi păstrat. Încearcă din nou peste câteva minute." },
      { status: 502 },
    );
  }

  await prisma.fisier.createMany({ data: randuri });

  /* --------------------------------------------------- ce s-a strans deja */

  const toate = await prisma.fisier.findMany({
    where: { dosarId: dosar.id },
    select: { tip: true },
  });
  const lipsa = lipsuri(toate.map(f => f.tip));
  // Word, Excel si arhivele se pastreaza in dosar si se pot descarca, dar modelul
  // nu le poate deschide asa cum sunt. Se spune aici, nu dupa verificare.
  const necitibile = randuri.filter(r => !formatul(r.numeFisier)?.citibilDeAi).map(r => r.numeFisier);

  // In jurnal scriem si cat s-a strans prin recodare: e singurul loc din care se
  // poate afla mai tarziu de ce dosarul ocupa mai putin decat s-a trimis.
  const strans = totalOcteti - octetiPastrati;
  const primite =
    `${randuri.length} ${randuri.length === 1 ? "document primit" : "documente primite"} · ` +
    (strans > 256 * 1024
      ? `${(totalOcteti / 1024 / 1024).toFixed(1)} MB primiți, ${(octetiPastrati / 1024 / 1024).toFixed(1)} MB păstrați`
      : `${(totalOcteti / 1024 / 1024).toFixed(1)} MB`);
  await prisma.evenimentFlux.create({
    data: {
      dosarId: dosar.id,
      etapa: "intrare",
      stare: "gata",
      mesaj: nesalvate.length === 0
        ? primite
        : `${primite}; ${nesalvate.length} nu au putut fi păstrate (${nesalvate.join(", ")})`,
    },
  });

  if (inventar.tokensIn > 0) {
    // Costul se scrie in jurnal, nu doar se trimite in raspuns: peste trei luni,
    // intrebarea „cat m-a costat cititul dosarelor?" are un raspuns care se poate
    // aduna, nu unul care a disparut odata cu ecranul.
    const citite = inventar.citiri.filter(Boolean).length;
    await prisma.evenimentFlux.create({
      data: {
        dosarId: dosar.id,
        etapa: "intrare",
        stare: "gata",
        mesaj: `Inventar: ${citite} ${citite === 1 ? "document citit" : "documente citite"} · `
          + `${inventar.tokensIn.toLocaleString("ro-RO")} tokeni · $${inventar.cost.toFixed(4)}`,
      },
    });
  }

  if (!porneste) {
    // Dosarul ramane deschis, in asteptarea restului documentelor. Etapa nu se
    // muta: „intrare / așteptare" e exact adevarul.
    await prisma.dosar.update({
      where: { id: dosar.id },
      data: { etapa: "intrare", stareEtapa: "asteptare" },
    });
  } else {
    await prisma.dosar.update({
      where: { id: dosar.id },
      data: { etapa: "intrare", stareEtapa: "in_lucru" },
    });

    // Raspunsul pleaca acum; citirea continua dupa el. Cand dosarul era gol,
    // fisierele sunt deja in memorie si nu le mai coboram inca o data din
    // stocare; cand se adauga peste altele, fluxul le ia pe toate de acolo.
    after(async () => {
      await ruleazaFlux({ dosarId: dosar.id, fisiere: eraGol ? pentruCitire : undefined });
    });
  }

  return NextResponse.json({
    dosarId: dosar.id,
    primite: randuri.length,
    octetiPrimiti: totalOcteti,
    octetiPastrati,
    inventar: {
      citite: inventar.citiri.filter(Boolean).length,
      cost: inventar.cost,
      denumiri: randuri.map(r => r.denumireAi ?? r.numeFisier),
    },
    nesalvate,
    necitibile,
    lipsa,
    pornit: porneste,
  }, { status: 201 });
}
