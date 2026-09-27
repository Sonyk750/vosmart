// Proba regulilor de cenzorat pe date construite de mana: fara AI, fara baza de
// date. Fiecare caz spune ce verdict trebuie sa iasa. Rulare: npm run proba:reguli
import { aplicaReguli } from "../lib/cenzorat/reguli";
import { calculeazaScor } from "../lib/cenzorat/scor";
import { EXTRAS_GOL, type ExtrasDosar } from "../lib/cenzorat/tipuri";
import { lunaDin } from "../lib/cenzorat/verificari";
import { numar } from "../lib/cenzorat/extragere";

const TOATE = ["lista_plata", "explicatii_lista", "distributia_facturilor", "facturi", "facturi_2", "extras_cont", "registru_casa", "registru_banca", "registru_fond"];
const IBAN = "RO49AAAA1B31007593840000";

function curat(): ExtrasDosar {
  const e: ExtrasDosar = structuredClone(EXTRAS_GOL);
  e.identificare = { ...e.identificare, denumire: "Asoc", cui: "123", presedinte: "P", administrator: "A", iban: IBAN };
  e.perioada = { ...e.perioada, dataAfisarii: "10.09.2026" };
  e.casa = { ...e.casa, soldInitial: 100, totalIncasari: 500, totalPlati: 400, soldFinal: 200, soldMaximZilnic: 600 };
  e.banca = { soldInitial: 1000, totalIncasari: 5000, totalPlati: 4000, soldFinal: 2000, conturi: [{ iban: IBAN, descriere: "curent", sold: 2000, soldInitial: 1000, totalIncasari: 5000, totalPlati: 4000 }] };
  e.extrase = [{ iban: IBAN, perioada: "august 2026", soldInitial: 1000, totalIncasari: 5000, totalPlati: 4000, soldFinal: 2000 }];
  e.distributie = { total: 3000, perioada: "august 2026", facturi: [
    { furnizor: "Apa Nova", numar: "A1", sumaFactura: 1000, sumaDistribuita: 1000 },
    { furnizor: "Engie", numar: "E1", sumaFactura: 2000, sumaDistribuita: 2000 },
  ] };
  e.furnizori = { facturi: [
    { furnizor: "Apa Nova", numar: "A1", data: null, suma: 1000, achitata: true, modalitatePlata: "banca" },
    { furnizor: "Engie", numar: "E1", data: null, suma: 2000, achitata: true, modalitatePlata: "banca" },
  ], totalNeachitat: 0 };
  e.fonduri = { rulment: 5000, reparatii: 1000, penalitati: 0, altele: [], miscari: [{ fond: "rulment", soldInitial: 5000, incasari: 0, cheltuieli: 0, soldFinal: 5000 }] };
  e.lista = { ...e.lista, totalCheltuieli: 3000, totalRestante: 0, numarApartamente: 2, coloane: ["Restanțe"], areColoanaRestante: true, areColoanaPenalizari: true, areColoanaFondRulment: true, totalDePlata: 3000, apartamente: [{ apartament: "1", totalDePlata: 1500 }, { apartament: "2", totalDePlata: 1500 }] };
  e.restantieri = { total: 0, apartamente: [] };
  e.penalizari = { aplicate: false, cotaZilnica: null, total: null };
  return e;
}

const docs = TOATE.map(t => ({ tip: t, numeFisier: t + ".pdf", perioadaAi: "august 2026" }));
function ruleaza(nume: string, e: ExtrasDosar, extra: Partial<Parameters<typeof aplicaReguli>[0]> = {}) {
  const c = aplicaReguli({ extras: e, cuiDeclarat: "123", denumireDeclarata: "Asoc", tipuriPrimite: TOATE, documente: docs, luna: "august", an: 2026, ...extra });
  const s = calculeazaScor(c);
  console.log(`${nume.padEnd(46)} → ${s.verdict.padEnd(10)} ${s.valoare}  [${c.map(x => `${x.cod}:${x.severitate}`).join(", ") || "—"}]`);
  return s;
}

let ok = true;
const astept = (s: { verdict: string }, v: string) => { if (s.verdict !== v) { ok = false; console.log(`   ✗ așteptat ${v}`); } };

astept(ruleaza("dosar curat", curat()), "conform");
{ const e = curat(); e.extrase![0].soldFinal = 1500; astept(ruleaza("banca ≠ extras (500 lei)", e), "grav"); }
{ const e = curat(); e.distributie.total = 2901; astept(ruleaza("listă ≠ distribuire (99 lei)", e), "neconform"); }
{ const e = curat(); e.distributie.total = -2000; e.distributie.total = 8000; astept(ruleaza("listă ≠ distribuire (5000 lei)", e), "grav"); }
{ const e = curat(); e.distributie.facturi![1].sumaDistribuita = 2500; astept(ruleaza("distribuit peste factură", e), "grav"); }
{ const e = curat(); e.distributie.facturi!.push({ ...e.distributie.facturi![0] }); astept(ruleaza("factură distribuită de două ori", e), "grav"); }
{ const e = curat(); e.lista.apartamente![1].totalDePlata = 1400; astept(ruleaza("suma apartamentelor ≠ total", e), "neconform"); }
{ const e = curat(); e.fonduri.miscari![0].soldFinal = 4000; astept(ruleaza("fond care nu se închide", e), "grav"); }
{ const e = curat(); e.extrase = []; astept(ruleaza("fără extrase citite", e), "incomplet"); }
{ const e = curat(); e.casa = { ...EXTRAS_GOL.casa }; e.banca = { ...EXTRAS_GOL.banca }; e.fonduri = { ...EXTRAS_GOL.fonduri }; e.distributie = { ...EXTRAS_GOL.distributie };
  const s = ruleaza("aproape nimic citit", e); if (s.verdict === "conform") { ok = false; console.log("   ✗ nu are voie să fie conform"); } }
{ const e = curat(); const p = curat(); p.casa.soldFinal = 90; astept(ruleaza("casa nu continuă luna trecută", e, { precedent: p }), "grav"); }
{ const e = curat(); astept(ruleaza("document din altă lună", e, { documente: docs.map(d => d.tip === "registru_casa" ? { ...d, perioadaAi: "iulie 2026" } : d) }), "observatii"); }
{ const e = curat(); e.banca.conturi.push({ iban: "RO11BBBB", descriere: "colector", sold: 50, soldInitial: 0, totalIncasari: 100, totalPlati: 10 });
  e.extrase!.push({ iban: "RO11BBBB", perioada: null, soldInitial: 0, soldFinal: 90, totalIncasari: 100, totalPlati: 10 });
  astept(ruleaza("două conturi, al doilea greșit", e), "grav"); }
{ const e = curat(); e.restantieri.total = 1600; e.lista.totalRestante = 1600; astept(ruleaza("restanțe 53% dintr-o lună", e), "observatii"); }

for (const [t, v] of [["iunie 2026", "6/2026"], ["06/2026", "6/2026"], ["iunie-iulie 2026", "null"], ["Luna IULIE 2026", "7/2026"]] as const) {
  const r = lunaDin(t); const txt = r ? `${r.luna}/${r.an}` : "null";
  if (txt !== v) { ok = false; console.log(`lunaDin(${t}) = ${txt}, așteptat ${v}`); }
}
console.log(ok ? "\nTOATE PROBELE AU TRECUT" : "\nUNELE PROBE AU PICAT");
