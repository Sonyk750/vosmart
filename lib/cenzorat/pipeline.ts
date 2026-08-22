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
 * `EvenimentFlux`, iar ecranul clientului citeste exact acele randuri. Inainte,
 * bara de progres era un `setInterval` care crestea cu 1% la 560 de milisecunde
 * si se oprea la 90 indiferent ce se intampla pe server — daca analiza cadea,
 * bara arata tot „82% · Finalizare raport".
 *
 * Ce se intampla la o eroare: etapa se marcheaza `esuata`, cu motivul scris pe
 * intelesul omului, si dosarul se opreste acolo. Nu inaintam cu date pe
 * jumatate: un raport de cenzor facut din jumatate de registru e mai rau decat
 * lipsa lui.
 */

export async function noteaza(
  documentId: string,
  etapa: Etapa,
  stare: StareEtapa,
  mesaj: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.evenimentFlux.create({ data: { documentId, etapa, stare, mesaj } }),
    prisma.document.update({
      where: { id: documentId },
      data: {
        etapa,
        stareEtapa: stare,
        ...(stare === "esuata" ? { status: "error", aiSummary: mesaj } : {}),
      },
    }),
  ]);
}

/** Aduce continutul fisierelor dosarului din stocare, ca sa poata fi recitite. */
async function incarcaFisiere(documentId: string): Promise<FisierDeCitit[]> {
  const randuri = await prisma.documentFile.findMany({
    where: { documentId },
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
      tip: r.type,
      numeFisier: r.fileName,
      mimeType: r.mimeType,
      continut: Buffer.concat(bucati),
    });
  }
  return rezultat;
}

export type OptiuniFlux = {
  documentId: string;
  /**
   * Continutul fisierelor, daca il avem deja in memorie (cazul incarcarii).
   * Lipsa lui inseamna reluare: se citesc din stocare.
   */
  fisiere?: FisierDeCitit[];
};

export async function ruleazaFlux({ documentId, fisiere }: OptiuniFlux): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { association: { select: { name: true, cui: true } } },
  });
  if (!doc) return;

  const inceput = Date.now();
  await prisma.document.update({ where: { id: documentId }, data: { inceputLa: new Date(), status: "analyzing" } });

  try {
    /* ---------------------------------------------------------- CITIRE */
    await noteaza(documentId, "extragere", "in_lucru", "Se deschid documentele din dosar");

    const deCitit = fisiere ?? (await incarcaFisiere(documentId));
    if (deCitit.length === 0) {
      await noteaza(documentId, "extragere", "esuata", "Dosarul nu conține niciun fișier care să poată fi citit.");
      return;
    }

    const { extras, tokensIn, tokensOut, netrimise } = await citesteDosar(
      deCitit,
      {
        denumire: doc.association?.name ?? "",
        cui: doc.association?.cui ?? "",
        luna: doc.month ?? "",
        an: doc.year ?? new Date().getFullYear(),
      },
      mesaj => noteaza(documentId, "extragere", "in_lucru", mesaj),
    );

    const incredere = increderaDate(extras);
    await prisma.document.update({
      where: { id: documentId },
      data: { extras: extras as never, incredere: incredere.procent, aiTokensIn: tokensIn, aiTokensOut: tokensOut },
    });
    await noteaza(
      documentId,
      "extragere",
      "gata",
      `${deCitit.length - netrimise.length} documente citite · ${incredere.gasite} din ${incredere.total} indicatori găsiți`,
    );

    /* ----------------------------------------------------- VERIFICĂRI */
    await noteaza(documentId, "verificare", "in_lucru", "Se aplică regulile de cenzorat");

    const constatari = aplicaReguli({
      extras,
      cuiDeclarat: doc.association?.cui ?? null,
      denumireDeclarata: doc.association?.name ?? null,
      tipuriPrimite: deCitit.map(f => f.tip),
    });

    // Constatarile se rescriu de la zero la fiecare rulare: o reluare nu trebuie
    // sa lase in urma constatari dintr-o citire veche. Cele adaugate de cenzor
    // raman — nu sunt ale noastre ca sa le stergem.
    await prisma.constatare.deleteMany({ where: { documentId, sursa: { not: "cenzor" } } });
    if (constatari.length > 0) {
      await prisma.constatare.createMany({
        data: constatari.map((c, i) => ({
          documentId,
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
      documentId,
      "verificare",
      "gata",
      constatari.length === 0
        ? "Nicio abatere semnalată de verificările automate"
        : `${constatari.length} ${constatari.length === 1 ? "constatare" : "constatări"} de analizat`,
    );

    /* --------------------------------------------------------- SINTEZĂ */
    await noteaza(documentId, "sinteza", "in_lucru", "Se pregătește proiectul de raport");

    const scor = calculeazaScor(constatari);
    const titluRaport = `Raport de cenzor · ${doc.month ?? ""} ${doc.year ?? ""} — ${doc.association?.name ?? ""}`.replace(/\s+/g, " ").trim();

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "analyzed",
        aiScore: scor.valoare,
        verdict: scor.verdict,
        // Campurile vechi raman completate, ca ecranele care inca le citesc sa
        // nu ramana goale in timpul tranzitiei.
        aiFindings: JSON.stringify(constatari.slice(0, 10).map(c => c.titlu)),
        aiSummary: `${constatari.length} constatări · încredere date ${incredere.procent}%`,
        terminatLa: new Date(),
      },
    });

    // Un dosar are un singur proiect de raport. La reluare il rescriem, nu mai
    // adaugam unul — altfel clientul vedea trei rapoarte pentru aceeasi luna.
    const existent = await prisma.report.findFirst({
      where: { associationId: doc.associationId, documentId },
      select: { id: true, status: true },
    });
    const dateRaport = {
      extras,
      scor,
      incredere,
      constatari,
      perioada: { luna: doc.month, an: doc.year },
      generatLa: new Date().toISOString(),
    };

    if (existent && existent.status !== "published") {
      await prisma.report.update({
        where: { id: existent.id },
        data: { title: titluRaport, data: dateRaport as never, month: doc.month, year: doc.year },
      });
    } else if (!existent) {
      await prisma.report.create({
        data: {
          associationId: doc.associationId,
          documentId,
          title: titluRaport,
          month: doc.month,
          year: doc.year,
          data: dateRaport as never,
          status: "draft",
        },
      });
    }

    await noteaza(documentId, "sinteza", "gata", `Scor ${scor.valoare}% · ${scor.verdict}`);
    await noteaza(documentId, "revizuire", "asteptare", "Proiectul de raport așteaptă revizuirea cenzorului");

    console.log(`[flux] dosar ${documentId} gata în ${Math.round((Date.now() - inceput) / 1000)}s`);
  } catch (e) {
    const brut = e instanceof Error ? e.message : String(e);
    // Raspunsurile de eroare vin uneori ca pagini HTML (504 de la un proxy).
    // Le curatam, ca mesajul din ecranul clientului sa fie o propozitie, nu markup.
    const curat = brut.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    console.error("[flux] eroare:", curat);
    const doc2 = await prisma.document.findUnique({ where: { id: documentId }, select: { etapa: true } });
    await noteaza(
      documentId,
      (doc2?.etapa as Etapa) ?? "extragere",
      "esuata",
      `Analiza s-a oprit: ${curat || "eroare necunoscută"}`,
    );
  }
}

/** Constatarile unui dosar, in forma cu care lucreaza scorul si ecranele. */
export async function constatariDosar(documentId: string): Promise<(Constatare & { id: string; stare: "deschisa" | "acceptata" | "respinsa"; notaCenzor: string | null })[]> {
  const randuri = await prisma.constatare.findMany({
    where: { documentId },
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
