import { prisma } from "@/lib/prisma";
import { citesteFisier } from "@/lib/stocare";
import { citesteDosar, FisierDeCitit } from "./extragere";
import { aplicaReguli, increderaDate } from "./reguli";
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
async function incarcaFisiere(dosarId: string): Promise<FisierDeCitit[]> {
  const randuri = await prisma.fisier.findMany({
    where: { dosarId },
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
    include: { contract: { select: { id: true, denumire: true, cui: true } } },
  });
  if (!dosar) return;

  const inceput = Date.now();
  await prisma.dosar.update({ where: { id: dosarId }, data: { inceputLa: new Date() } });

  try {
    /* ---------------------------------------------------------- CITIRE */
    await noteaza(dosarId, "extragere", "in_lucru", "Se deschid documentele din dosar");

    const deCitit = fisiere ?? (await incarcaFisiere(dosarId));
    if (deCitit.length === 0) {
      await noteaza(dosarId, "extragere", "esuata", "Dosarul nu conține niciun fișier care să poată fi citit.");
      return;
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
    );

    const incredere = increderaDate(extras);
    await prisma.dosar.update({
      where: { id: dosarId },
      data: { extras: extras as never, incredere: incredere.procent, tokensIn, tokensOut },
    });
    await noteaza(
      dosarId,
      "extragere",
      "gata",
      `${deCitit.length - netrimise.length} documente citite · ${incredere.gasite} din ${incredere.total} indicatori găsiți`,
    );

    /* ----------------------------------------------------- VERIFICĂRI */
    await noteaza(dosarId, "verificare", "in_lucru", "Se aplică regulile de cenzorat");

    const constatari = aplicaReguli({
      extras,
      cuiDeclarat: dosar.contract.cui,
      denumireDeclarata: dosar.contract.denumire,
      tipuriPrimite: deCitit.map(f => f.tip),
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
    const dateRaport = {
      extras, scor, incredere, constatari,
      perioada: { luna: dosar.luna, an: dosar.an },
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
