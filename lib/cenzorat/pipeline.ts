import { prisma } from "@/lib/prisma";
import { citesteFisier } from "@/lib/stocare";
import { citesteDosar, FisierDeCitit } from "./extragere";
import { aplicaReguli, increderaDate } from "./reguli";
import { profilAsociatiei } from "./istoric";
import { calculeazaScor } from "./scor";
import { Constatare, Etapa, ExtrasDosar, StareEtapa } from "./tipuri";

/**
 * Fluxul unui dosar, de la fisiere la proiect de raport.
 *
 * Etapele sunt reale, nu decorative: fiecare isi scrie un rand in
 * `EvenimentFlux`, iar ecranul citeste exact acele randuri. Cand ceva cade,
 * bara se opreste unde a ajuns si scrie de ce, in loc sa urce mai departe.
 */

export async function noteaza(
  dosarId: string,
  etapa: Etapa,
  stare: StareEtapa,
  mesaj: string,
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.evenimentFlux.create({ data: { dosarId, etapa, stare, mesaj } }),
      prisma.dosar.update({
        where: { id: dosarId },
        data: { etapa, stareEtapa: stare, ...(stare === "esuata" ? { rezumat: mesaj } : {}) },
      }),
    ]);
  } catch {
    // Dosarul poate sa nu mai existe: analiza dureaza vreo jumatate de minut, iar
    // butonul de stergere e la indemana omului tot timpul asta. Cand se intampla,
    // n-avem unde scrie — dar mai ales n-avem voie sa aruncam de aici, fiindca
    // `noteaza` e chemata SI din blocul care trateaza erorile: o exceptie in el
    // ar iesi neprinsa si ar umple jurnalul cu o violare de cheie externa in loc
    // de motivul adevarat.
    console.warn(`[flux] nu am putut nota „${mesaj}" — dosarul ${dosarId} nu mai există`);
  }
}

/** Aduce continutul fisierelor dosarului din stocare, ca sa poata fi recitite. */
async function incarcaFisiere(dosarId: string, doarIds?: string[]): Promise<FisierDeCitit[]> {
  const randuri = await prisma.fisier.findMany({
    where: { dosarId, ...(doarIds ? { id: { in: doarIds } } : {}) },
    orderBy: { createdAt: "asc" },
  });

  const rezultat: FisierDeCitit[] = [];
  for (const r of randuri) {
    const continut = await citesteFisier(r.blobUrl);
    if (!continut) continue;
    const bucati: Uint8Array[] = [];
    const reader = continut.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) bucati.push(value);
    }
    rezultat.push({
      tip: r.tip,
      numeFisier: r.numeFisier,
      mimeType: r.mimeType,
      continut: Buffer.concat(bucati),
    });
  }
  return rezultat;
}

export type OptiuniFlux = {
  dosarId: string;
  /**
   * Continutul fisierelor, daca il avem deja in memorie (cazul incarcarii).
   * Lipsa lui inseamna reluare: se citesc din stocare.
   */
  fisiere?: FisierDeCitit[];
};

export async function ruleazaFlux({ dosarId, fisiere }: OptiuniFlux): Promise<void> {
  const dosar = await prisma.dosar.findUnique({
    where: { id: dosarId },
    include: { contract: { select: { id: true, denumire: true, cui: true, adresa: true } } },
  });
  if (!dosar) return;

  const inceput = Date.now();
  await prisma.dosar.update({ where: { id: dosarId }, data: { inceputLa: new Date() } });

  try {
    /* ---------------------------------------------------------- CITIRE */
    await noteaza(dosarId, "extragere", "in_lucru", "Se deschid documentele din dosar");

    /**
     * CE SE RECITESTE SI CE NU.
     *
     * O verificare pe douazeci si doua de documente costa in jur de un dolar. Daca
     * dupa ea mai intra o factura, n-are niciun rost sa se plateasca a doua oara
     * citirea celor douazeci si doua — se citeste factura, iar ce iese din ea se
     * imbina peste ce se stia.
     *
     * Reluarea completa ramane pentru cazurile in care asa TREBUIE: cand nu s-a
     * citit nimic pana acum, si cand din dosar A DISPARUT un document. La stergere
     * nu se poate scoate din `extras` doar ce venise de la el, asa ca singurul
     * raspuns corect e sa se citeasca tot din nou.
     */
    const toateRandurile = await prisma.fisier.findMany({
      where: { dosarId }, select: { id: true, tip: true }, orderBy: { createdAt: "asc" },
    });
    const idsAcum = toateRandurile.map(f => f.id);
    const cititeInainte = Array.isArray(dosar.fisiereCitite) ? (dosar.fisiereCitite as string[]) : [];
    const stiute = new Set(cititeInainte.filter(id => idsAcum.includes(id)));

    const nuS_aPierdutNimic = cititeInainte.length === stiute.size;
    const incremental = Boolean(dosar.extras) && nuS_aPierdutNimic && stiute.size > 0 && stiute.size < idsAcum.length;
    const idsDeCitit = incremental ? idsAcum.filter(id => !stiute.has(id)) : idsAcum;

    const deCitit = fisiere && !incremental
      ? fisiere
      : await incarcaFisiere(dosarId, incremental ? idsDeCitit : undefined);

    if (deCitit.length === 0) {
      // Nimic nou si nimic pierdut: dosarul a fost deja citit intreg. Nu mai
      // platim o rulare ca sa aflam acelasi lucru.
      if (incremental || (stiute.size > 0 && nuS_aPierdutNimic)) {
        await noteaza(dosarId, "extragere", "gata", "Toate documentele erau deja citite — nu s-a recitit nimic.");
      } else {
        await noteaza(dosarId, "extragere", "esuata", "Dosarul nu conține niciun fișier care să poată fi citit.");
        return;
      }
    }

    if (incremental) {
      await noteaza(
        dosarId, "extragere", "in_lucru",
        `Se citesc doar cele ${deCitit.length} ${deCitit.length === 1 ? "document nou" : "documente noi"} · ${stiute.size} erau deja citite`,
      );
    }

    const { extras, tokensIn, tokensOut, netrimise } = await citesteDosar(
      deCitit,
      {
        denumire: dosar.contract.denumire,
        cui: dosar.contract.cui,
        luna: dosar.luna,
        an: dosar.an,
      },
      mesaj => noteaza(dosarId, "extragere", "in_lucru", mesaj),
      incremental ? (dosar.extras as ExtrasDosar) : null,
    );

    const incredere = increderaDate(extras);
    await prisma.dosar.update({
      where: { id: dosarId },
      data: {
        extras: extras as never,
        incredere: incredere.procent,
        // Tokenii se ADUNA: la o citire incrementala, cei de acum sunt doar ai
        // documentelor noi, iar costul dosarului e tot ce s-a cheltuit pe el.
        tokensIn: incremental ? (dosar.tokensIn ?? 0) + tokensIn : tokensIn,
        tokensOut: incremental ? (dosar.tokensOut ?? 0) + tokensOut : tokensOut,
        fisiereCitite: idsAcum as never,
      },
    });
    await noteaza(
      dosarId,
      "extragere",
      "gata",
      incremental
        ? `${deCitit.length - netrimise.length} documente noi citite (${idsAcum.length} în dosar) · ${incredere.gasite} din ${incredere.total} indicatori găsiți`
        : `${deCitit.length - netrimise.length} documente citite · ${incredere.gasite} din ${incredere.total} indicatori găsiți`,
    );

    /* ----------------------------------------------------- VERIFICĂRI */
    await noteaza(dosarId, "verificare", "in_lucru", "Se aplică regulile de cenzorat");

    // Ce stim despre asociatia asta din lunile ei de dinainte: ce cota de
    // penalizare foloseste, ce coloane are lista ei, ce inseamna acolo o restanta
    // mare. Regulile se masoara dupa practica ei, nu dupa un ideal inventat.
    const istoric = await profilAsociatiei(dosar.contractId, dosarId);
    if (istoric.luni > 0) {
      await noteaza(dosarId, "verificare", "in_lucru",
        `Se compară și cu ${istoric.luni} ${istoric.luni === 1 ? "lună verificată anterior" : "luni verificate anterior"}`);
    }

    const constatari = aplicaReguli({
      extras,
      istoric,
      cuiDeclarat: dosar.contract.cui,
      denumireDeclarata: dosar.contract.denumire,
      // Toate tipurile din dosar, nu doar cele citite acum: la o citire
      // incrementala, `deCitit` are doar documentele noi, iar regulile care se
      // uita la ce LIPSESTE ar fi crezut ca dosarul are un singur document.
      tipuriPrimite: toateRandurile.map(f => f.tip),
    });

    // Constatarile se rescriu de la zero la fiecare rulare: o reluare nu trebuie
    // sa lase in urma constatari dintr-o citire veche. Cele adaugate de cenzor
    // raman — nu sunt ale noastre ca sa le stergem.
    await prisma.constatare.deleteMany({ where: { dosarId, sursa: { not: "cenzor" } } });
    if (constatari.length > 0) {
      await prisma.constatare.createMany({
        data: constatari.map((c, i) => ({
          dosarId,
          cod: c.cod,
          titlu: c.titlu,
          detaliu: c.detaliu,
          severitate: c.severitate,
          sursa: c.sursa,
          temei: c.temei,
          probe: c.probe as never,
          recomandare: c.recomandare,
          ordine: i,
        })),
      });
    }

    await noteaza(
      dosarId,
      "verificare",
      "gata",
      constatari.length === 0
        ? "Nicio abatere semnalată de verificările automate"
        : `${constatari.length} ${constatari.length === 1 ? "constatare" : "constatări"} de analizat`,
    );

    /* --------------------------------------------------------- SINTEZĂ */
    await noteaza(dosarId, "sinteza", "in_lucru", "Se pregătește raportul AI");

    const scor = calculeazaScor(constatari);
    const titlu = `Raport AI · ${dosar.luna} ${dosar.an} — ${dosar.contract.denumire}`;

    await prisma.dosar.update({
      where: { id: dosarId },
      data: {
        scor: scor.valoare,
        verdict: scor.verdict,
        rezumat: `${constatari.length} constatări · încredere date ${incredere.procent}%`,
        terminatLa: new Date(),
      },
    });

    // Un dosar are un singur raport AI. La reluare se rescrie, nu se mai adauga
    // unul — altfel clientul vedea trei rapoarte pentru aceeasi luna.
    // ACEEASI FORMA ca la raportul semnat (`versiune: 2`), nu una a ei.
    //
    // Pagina de raport e una singura, si pentru proiectul AI, si pentru cel
    // semnat. Raportul AI se salva insa fara `asociatie`, `concluzie` si
    // `semnatar`, iar pagina cadea cu eroare de server cand incerca sa le
    // citeasca. Doua forme pentru acelasi lucru inseamna, mai devreme sau mai
    // tarziu, un ecran care crapa.
    const dateRaport = {
      versiune: 2,
      asociatie: {
        denumire: dosar.contract.denumire,
        cui: dosar.contract.cui,
        adresa: dosar.contract.adresa,
      },
      perioada: { luna: dosar.luna, an: dosar.an },
      extras,
      incredere,
      scor,
      constatari,
      // Concluzia si semnatura sunt ale omului. Pana le scrie el, lipsesc — iar
      // bara de sus marcheaza raportul drept proiect nesemnat.
      concluzie: null,
      semnatar: null,
      semnatLa: null,
      generatLa: new Date().toISOString(),
    };
    await prisma.report.upsert({
      where: { dosarId_tip: { dosarId, tip: "ai" } },
      update: { titlu, date: dateRaport as never },
      create: { dosarId, contractId: dosar.contractId, tip: "ai", titlu, date: dateRaport as never },
    });

    await noteaza(dosarId, "sinteza", "gata", `Scor ${scor.valoare}% · ${scor.verdict}`);
    await noteaza(dosarId, "revizuire", "asteptare", "Raportul AI așteaptă revizuirea cenzorului");

    console.log(`[flux] dosar ${dosarId} gata în ${Math.round((Date.now() - inceput) / 1000)}s`);
  } catch (e) {
    // Intai intrebam daca dosarul mai exista. Daca omul l-a sters intre timp,
    // nu e o defectiune: e o cerere anulata.
    const inca = await prisma.dosar.findUnique({ where: { id: dosarId }, select: { etapa: true } });
    if (!inca) {
      console.log(`[flux] dosarul ${dosarId} a fost șters în timpul analizei — mă opresc`);
      return;
    }

    const brut = e instanceof Error ? e.message : String(e);
    // Raspunsurile de eroare vin uneori ca pagini HTML (504 de la un proxy).
    // Le curatam, ca mesajul din ecran sa fie o propozitie, nu markup.
    const curat = brut.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    console.error("[flux] eroare:", curat);
    await noteaza(dosarId, (inca.etapa as Etapa) ?? "extragere", "esuata", `Analiza s-a oprit: ${curat || "eroare necunoscută"}`);
  }
}

/** Constatarile unui dosar, in forma cu care lucreaza scorul si ecranele. */
export async function constatariDosar(dosarId: string): Promise<
  (Constatare & { id: string; stare: "deschisa" | "acceptata" | "respinsa"; notaCenzor: string | null })[]
> {
  const randuri = await prisma.constatare.findMany({
    where: { dosarId },
    orderBy: [{ ordine: "asc" }, { createdAt: "asc" }],
  });
  return randuri.map(r => ({
    id: r.id,
    cod: r.cod,
    titlu: r.titlu,
    detaliu: r.detaliu,
    severitate: r.severitate as Constatare["severitate"],
    sursa: r.sursa as Constatare["sursa"],
    temei: r.temei,
    probe: (r.probe as Constatare["probe"]) ?? [],
    recomandare: r.recomandare,
    stare: r.stare as "deschisa" | "acceptata" | "respinsa",
    notaCenzor: r.notaCenzor,
  }));
}

export type { ExtrasDosar };
