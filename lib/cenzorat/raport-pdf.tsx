import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { SEVERITATI, normalizeaza, type Constatare, type ExtrasDosar, type Severitate } from "./tipuri";
import { VERDICTE, type Verdict } from "./scor";
import { eticheta } from "./documente";

/**
 * Raportul semnat, ca PDF facut pe SERVER.
 *
 * Asociatia si administratorul nu au cont in VoSmart: un link catre pagina de
 * raport nu le-ar deschide nimic. Primesc documentul insusi, atasat la email.
 * Se face din aceeasi copie inghetata la semnare, deci spune exact ce s-a semnat,
 * iar amprenta de pe ultima linie e cea din baza.
 *
 * Fonturile se citesc de pe disc: Helvetica, fontul implicit, n-are „ș" si „ț"
 * cu virgula. Pe Vercel ele intra in pachetul functiei prin
 * `outputFileTracingIncludes` (next.config.ts).
 */

let fonturi = false;
function inregistreazaFonturi() {
  if (fonturi) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(dir, "Roboto-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "Roboto-Bold.ttf"), fontWeight: "bold" },
      { src: path.join(dir, "Roboto-Italic.ttf"), fontStyle: "italic" },
    ],
  });
  Font.registerHyphenationCallback(w => [w]);
  fonturi = true;
}

export type DateRaportSemnat = {
  asociatie: { denumire: string | null; cui: string | null; adresa: string | null };
  perioada: { luna: string | null; an: number | null };
  extras: ExtrasDosar | null;
  incredere: { procent: number; gasite: number; total: number };
  scor: { valoare: number; verdict: Verdict };
  constatari: (Constatare & { stare?: string; notaCenzor?: string | null })[];
  concluzie: string | null;
  bunDePlata?: boolean | null;
  documente?: { numeFisier: string; tip: string; amprenta: string | null; cont?: string | null }[];
  semnatar: string | null;
  semnatLa: string | null;
};

const C = { cerneala: "#111827", sters: "#6B7280", linie: "#E5E7EB", banda: "#F9FAFB", verde: "#047857", rosu: "#B91C1C" };
const CUL_SEV: Record<Severitate, string> = { critica: "#DC2626", ridicata: "#EA580C", medie: "#D97706", scazuta: "#0284C7", info: "#64748B" };
const CUL_VERDICT: Record<Verdict, string> = { conform: "#059669", observatii: "#0284C7", incomplet: "#D97706", neconform: "#D97706", grav: "#DC2626" };

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 50, paddingHorizontal: 38, fontFamily: "Roboto", fontSize: 9, color: C.cerneala },
  antet: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: C.cerneala, paddingBottom: 8 },
  mic: { fontSize: 7.5, color: C.sters, textTransform: "uppercase", letterSpacing: 1.2 },
  titlu: { fontSize: 16, fontWeight: "bold", marginTop: 3 },
  sectiune: { marginTop: 14 },
  h2: { fontSize: 10.5, fontWeight: "bold", marginBottom: 5 },
  rand: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.linie, paddingVertical: 2.5 },
  eticheta: { color: C.sters },
  constatare: { marginBottom: 7, padding: 7, backgroundColor: C.banda, borderLeftWidth: 3 },
  subsol: { position: "absolute", bottom: 20, left: 38, right: 38, fontSize: 7, color: C.sters, borderTopWidth: 0.5, borderTopColor: C.linie, paddingTop: 5 },
});

const lei = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " lei";

function Rand({ e, v }: { e: string; v: string | number }) {
  return (
    <View style={s.rand}>
      <Text style={s.eticheta}>{e}</Text>
      <Text>{String(v)}</Text>
    </View>
  );
}

function RaportPdf({ d, amprenta }: { d: DateRaportSemnat; amprenta: string }) {
  const e = d.extras ? normalizeaza(d.extras) : null;
  const verdict = VERDICTE[d.scor.verdict] ?? VERDICTE.observatii;
  const retinute = d.constatari.filter(c => c.stare !== "respinsa");
  const recomandari = retinute.filter(c => c.recomandare).map(c => c.recomandare as string);
  const bun = d.bunDePlata;

  return (
    <Document title={`Raport de cenzor ${d.perioada.luna ?? ""} ${d.perioada.an ?? ""}`} author="VoSmart">
      <Page size="A4" style={s.pagina}>
        <View style={s.antet}>
          <View style={{ maxWidth: 360 }}>
            <Text style={s.mic}>Raport de cenzor</Text>
            <Text style={s.titlu}>{d.asociatie.denumire ?? "Asociație de proprietari"}</Text>
            <Text style={{ color: C.sters, marginTop: 2 }}>
              {[d.asociatie.cui && `CUI ${d.asociatie.cui}`, d.asociatie.adresa].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: CUL_VERDICT[d.scor.verdict] }}>{d.scor.valoare}%</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: CUL_VERDICT[d.scor.verdict], textTransform: "uppercase" }}>{verdict.eticheta}</Text>
            <Text style={{ color: C.sters, marginTop: 4 }}>Perioada: {d.perioada.luna} {d.perioada.an}</Text>
          </View>
        </View>

        {/* Decizia asupra listei — primul lucru pe care il cauta administratorul. */}
        {bun !== undefined && bun !== null && (
          <View style={{ marginTop: 12, padding: 9, borderWidth: 1.5, borderColor: bun ? C.verde : C.rosu, backgroundColor: bun ? "#ECFDF5" : "#FEF2F2" }}>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: bun ? C.verde : C.rosu }}>
              {bun ? "BUN DE PLATĂ" : "NU ARE BUN DE PLATĂ"}
            </Text>
            <Text style={{ marginTop: 3 }}>
              {bun
                ? `Lista de plată pe ${d.perioada.luna} ${d.perioada.an} poate fi afișată.`
                : `Lista de plată pe ${d.perioada.luna} ${d.perioada.an} nu se afișează până la remedierea constatărilor de mai jos.`}
            </Text>
          </View>
        )}

        {e && (
          <View style={s.sectiune}>
            <Text style={s.h2}>I. Situația lunii</Text>
            <Text style={{ color: C.sters, fontSize: 7.5, marginBottom: 4 }}>
              Cifre citite din documentele primite. Cele confruntate între ele sunt verificate prin constatările din secțiunea II.
            </Text>
            <View style={{ flexDirection: "row", gap: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.mic, { marginTop: 3 }]}>Casierie</Text>
                <Rand e="Sold inițial" v={lei(e.casa.soldInitial)} />
                <Rand e="Încasări" v={lei(e.casa.totalIncasari)} />
                <Rand e="Plăți" v={lei(e.casa.totalPlati)} />
                <Rand e="Sold final" v={lei(e.casa.soldFinal)} />
                <Text style={[s.mic, { marginTop: 6 }]}>Listă de plată</Text>
                <Rand e="Total repartizat" v={lei(e.lista.totalCheltuieli)} />
                <Rand e="Restanțe" v={lei(e.restantieri.total ?? e.lista.totalRestante)} />
                <Rand e="Apartamente" v={e.lista.numarApartamente ?? "—"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.mic, { marginTop: 3 }]}>Bancă</Text>
                {/* Pe fiecare cont: un singur „sold final" peste mai multe conturi
                    ar fi fost al unuia singur, tiparit ca total. */}
                {e.banca.conturi.length > 1
                  ? e.banca.conturi.map((c, i) => <Rand key={i} e={`Sold final ${c.iban ?? c.descriere}`} v={lei(c.sold)} />)
                  : <>
                      <Rand e="Sold inițial" v={lei(e.banca.soldInitial)} />
                      <Rand e="Încasări" v={lei(e.banca.totalIncasari)} />
                      <Rand e="Plăți" v={lei(e.banca.totalPlati)} />
                      <Rand e="Sold final" v={lei(e.banca.soldFinal)} />
                    </>}
                <Text style={[s.mic, { marginTop: 6 }]}>Fonduri</Text>
                <Rand e="Fond de rulment" v={lei(e.fonduri.rulment)} />
                <Rand e="Fond de reparații" v={lei(e.fonduri.reparatii)} />
                {e.fonduri.penalitati !== null && <Rand e="Fond penalități" v={lei(e.fonduri.penalitati)} />}
              </View>
            </View>
          </View>
        )}

        <View style={s.sectiune}>
          <Text style={s.h2}>II. Constatări ({retinute.length})</Text>
          {retinute.length === 0
            ? <Text>Nu au fost reținute abateri pentru perioada verificată.</Text>
            : retinute.map((c, i) => (
                <View key={i} style={[s.constatare, { borderLeftColor: CUL_SEV[c.severitate] }]} wrap={false}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "bold", maxWidth: 420 }}>{i + 1}. {c.titlu}</Text>
                    <Text style={{ fontSize: 7, fontWeight: "bold", color: CUL_SEV[c.severitate] }}>{SEVERITATI[c.severitate].eticheta.toUpperCase()}</Text>
                  </View>
                  <Text style={{ marginTop: 3, lineHeight: 1.35 }}>{c.detaliu}</Text>
                  {c.probe.slice(0, 8).map((p, j) => <Rand key={j} e={p.eticheta} v={p.valoare} />)}
                  {c.temei && <Text style={{ marginTop: 3, fontStyle: "italic", color: "#1D4ED8" }}>{c.temei}</Text>}
                  {c.notaCenzor && <Text style={{ marginTop: 3, fontStyle: "italic" }}>Nota cenzorului: {c.notaCenzor}</Text>}
                </View>
              ))}
        </View>

        {recomandari.length > 0 && (
          <View style={s.sectiune}>
            <Text style={s.h2}>III. Recomandări</Text>
            {recomandari.map((r, i) => <Text key={i} style={{ marginBottom: 2 }}>{i + 1}. {r}</Text>)}
          </View>
        )}

        <View style={s.sectiune} wrap={false}>
          <Text style={s.h2}>IV. Concluzie</Text>
          <Text style={{ lineHeight: 1.4 }}>{d.concluzie || verdict.descriere}</Text>
          <Text style={{ marginTop: 5, color: C.sters }}>
            Scor {d.scor.valoare}% — {verdict.eticheta} · acoperirea datelor {d.incredere.procent}%
          </Text>
          <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "flex-end" }}>
            <View style={{ width: 200, alignItems: "center" }}>
              <Text style={s.mic}>Cenzor</Text>
              <Text style={{ marginTop: 3, fontWeight: "bold" }}>{d.semnatar ?? ""}</Text>
              <Text style={{ color: C.sters, marginTop: 2 }}>
                Semnat {d.semnatLa ? new Date(d.semnatLa).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }) : ""}
              </Text>
            </View>
          </View>
        </View>

        {(d.documente?.length ?? 0) > 0 && (
          <View style={s.sectiune}>
            <Text style={s.h2}>Anexă — documentele verificate ({d.documente!.length})</Text>
            {d.documente!.map((f, i) => (
              <View key={i} style={[s.rand, { fontSize: 7.5 }]}>
                <Text style={{ maxWidth: 300 }}>{eticheta(f.tip)} · {f.numeFisier}{f.cont ? ` · ${f.cont}` : ""}</Text>
                <Text style={{ color: C.sters, fontFamily: "Roboto" }}>{f.amprenta ? f.amprenta.slice(0, 16) : "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.subsol} fixed>
          <Text>Întocmit în conformitate cu Legea nr. 196/2018 · VoSmart — cenzorat pentru asociații de proprietari</Text>
          <Text style={{ marginTop: 2 }}>Amprenta raportului semnat (SHA-256): {amprenta}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} din ${totalPages}`} style={{ position: "absolute", right: 0, top: 5 }} />
        </View>
      </Page>
    </Document>
  );
}

export async function pdfRaportSemnat(date: DateRaportSemnat, amprenta: string): Promise<Buffer> {
  inregistreazaFonturi();
  return renderToBuffer(<RaportPdf d={date} amprenta={amprenta} />);
}
